/**
 * WorkOS AuthKit for the staff portal. Server code only.
 *
 * Uses the official SDK (`@workos/authkit-tanstack-react-start`) for the
 * session cookie, PKCE sign-in, callback, refresh, organization switch, and
 * sign-out. Import this module only from server code: `src/start.ts`, server
 * route handlers, and server function handlers (through dynamic import or
 * `rails.ts`). Never import the SDK from a component or a route loader: its
 * package also defines server functions that return the access token, and
 * those must never become reachable from the browser.
 */
import { env } from "cloudflare:workers";
import { configure } from "@workos/authkit-session";
import { authkitMiddleware, getAuthkit, getAuthKitContextOrNull } from "@workos/authkit-tanstack-react-start";
import { SIGN_OUT_PATH } from "./boundary";
import {
  resolveAuthOrigins,
  resolveProductionAccess,
  resolveStaffAccess,
  safeReturnPath,
  toBrowserUrl,
  workosBrowserOrigin,
  workosSetting,
  type AuthOrigins,
  type PortalEnv,
  type StaffAccess,
} from "./access";

const dev = import.meta.env.DEV;

function portalEnv(): PortalEnv {
  return env as PortalEnv;
}

export function currentStaffAccess(): StaffAccess {
  // `import.meta.env.DEV` is a build-time constant. Production bundles keep
  // only the second branch, so demo and emulator access cannot exist there.
  if (import.meta.env.DEV) return resolveStaffAccess({ dev: true, env: portalEnv() });
  return resolveProductionAccess(portalEnv());
}

/** The callback, start page, and emulator address for this request. See `resolveAuthOrigins`. */
function authOrigins(request: Request): AuthOrigins {
  return resolveAuthOrigins(request, { dev, env: portalEnv() });
}

/** Extra CSP `form-action` origins: the WorkOS sign-out page, when WorkOS sign-in is on. */
export function formTargets(request: Request): string[] {
  if (currentStaffAccess().kind !== "workos") return [];
  return [workosBrowserOrigin({ dev, env: portalEnv() }, authOrigins(request).browserUrl)];
}

let configured = false;

/** Points the SDK at the filtered Worker settings. Runs once per isolate. */
function configureWorkos() {
  if (configured) return;
  configure((name: string) => workosSetting(name, { dev, env: portalEnv() }));
  configured = true;
}

const sdkMiddleware = authkitMiddleware();
type SdkServer = (args: unknown) => Promise<unknown>;

/**
 * The body of the WorkOS request middleware in `src/start.ts`. Runs the SDK
 * middleware only when WorkOS sign-in is on. It reads the session cookie,
 * refreshes an expired access token, and saves the new cookie.
 *
 * Sign-out skips it: a refresh there would write the session cookie again
 * after sign-out cleared it.
 */
export function runWorkosMiddleware<T extends { request: Request; next: () => unknown }>(args: T): ReturnType<T["next"]> {
  if (currentStaffAccess().kind !== "workos" || new URL(args.request.url).pathname === SIGN_OUT_PATH) {
    return args.next() as ReturnType<T["next"]>;
  }
  configureWorkos();
  return (sdkMiddleware.options.server as unknown as SdkServer)(args) as ReturnType<T["next"]>;
}

/** The signed-in staff user, as safe display data. Never holds a token. */
export interface StaffUser {
  name: string;
  email: string;
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  organizationId: string | null;
  user: Parameters<Awaited<ReturnType<typeof getAuthkit>>["refreshSession"]>[0]["user"];
  impersonator: Parameters<Awaited<ReturnType<typeof getAuthkit>>["refreshSession"]>[0]["impersonator"];
}

/** Per-request session state, so parallel loaders share one organization switch. */
const requestSessions = new WeakMap<Request, { tokens: SessionTokens | null; switching: Map<string, Promise<boolean>> }>();

function requestSession() {
  const context = getAuthKitContextOrNull();
  if (!context) return null;
  let state = requestSessions.get(context.request);
  if (!state) {
    const auth = context.auth();
    const tokens: SessionTokens | null =
      auth.user && auth.accessToken && "refreshToken" in auth && auth.refreshToken
        ? {
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken,
            organizationId: auth.organizationId ?? null,
            user: auth.user,
            impersonator: auth.impersonator,
          }
        : null;
    state = { tokens, switching: new Map() };
    requestSessions.set(context.request, state);
  }
  return state;
}

export function signedInUser(): StaffUser | null {
  const tokens = requestSession()?.tokens;
  if (!tokens) return null;
  const { firstName, lastName, email } = tokens.user;
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  return { name, email };
}

/** The access token for Rails. Server only; never return it from a server function. */
export function currentAccessToken(): string | null {
  return requestSession()?.tokens?.accessToken ?? null;
}

/**
 * Refreshes the session, for another organization or for the same one.
 * WorkOS issues the new token only for an active membership. Saves the new
 * session cookie on this response. Returns false when WorkOS refuses.
 */
export function refreshFor(organizationId: string): Promise<boolean> {
  const state = requestSession();
  if (!state?.tokens) return Promise.resolve(false);
  const pending = state.switching.get(organizationId);
  if (pending) return pending;

  const tokens = state.tokens;
  const run = (async () => {
    try {
      const authkit = await getAuthkit();
      const { auth, encryptedSession } = await authkit.refreshSession(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: tokens.user, impersonator: tokens.impersonator },
        organizationId,
      );
      if (!auth.user || !auth.accessToken || auth.organizationId !== organizationId) return false;
      await authkit.saveSession(undefined, encryptedSession);
      state.tokens = {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken ?? tokens.refreshToken,
        organizationId: auth.organizationId ?? null,
        user: auth.user,
        impersonator: auth.impersonator,
      };
      return true;
    } catch {
      return false;
    }
  })();
  state.switching.set(organizationId, run);
  return run;
}

export function currentOrganizationId(): string | null {
  return requestSession()?.tokens?.organizationId ?? null;
}

/**
 * Starts sign-in: sets the PKCE verifier cookie and returns the AuthKit URL,
 * or `null` when development sign-in is not allowed from this host. The callback address is chosen per request and passed to the SDK, which
 * seals it into the PKCE state. Nothing global changes.
 */
export async function signInUrl(request: Request, returnTo: string | null): Promise<string | null> {
  const origins = authOrigins(request);
  if (!origins.allowed) return null;
  configureWorkos();
  const authkit = await getAuthkit();
  const { url } = await authkit.createSignIn(undefined, {
    returnPathname: safeReturnPath(returnTo),
    redirectUri: origins.redirectUri,
  });
  return toBrowserUrl(url, { dev, env: portalEnv() }, origins.browserUrl);
}

function sessionIdFrom(accessToken: string): string | null {
  try {
    const payload = accessToken.split(".")[1] ?? "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    const sid = (JSON.parse(json) as { sid?: unknown }).sid;
    return typeof sid === "string" ? sid : null;
  } catch {
    return null;
  }
}

/**
 * Ends the session: clears the cookie and returns where to send the browser.
 * With a session, that is the WorkOS logout URL, which ends the WorkOS session
 * and returns to the portal start page. Without one, it is the start page.
 */
export async function signOut(request: Request): Promise<{ location: string; cookies: string[] }> {
  configureWorkos();
  const origins = authOrigins(request);
  const returnTo = origins.home;
  const authkit = await getAuthkit();
  let sessionId: string | null = null;
  try {
    const session = await authkit.getSession(request);
    sessionId = session ? sessionIdFrom(session.accessToken) : null;
  } catch {
    sessionId = null;
  }

  if (!sessionId) {
    const cleared = await authkit.clearSession(new Response());
    return { location: returnTo, cookies: cleared.response?.headers.getSetCookie() ?? headerList(cleared.headers) };
  }

  const { logoutUrl, response, headers } = await authkit.signOut(sessionId, { returnTo });
  return {
    location: toBrowserUrl(logoutUrl, { dev, env: portalEnv() }, origins.browserUrl),
    cookies: response?.headers.getSetCookie() ?? headerList(headers),
  };
}

function headerList(headers: Record<string, string | string[]> | undefined): string[] {
  const value = headers?.["Set-Cookie"];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

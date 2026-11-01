/**
 * WorkOS AuthKit for gym site members. Server code only.
 *
 * Uses the official SDK for the session cookie, PKCE sign-in, callback,
 * refresh, and sign-out. Import this module only from server code:
 * `src/start.ts`, server route handlers, and server function handlers through
 * `site.ts`. Never import the SDK from a component or a route loader: the
 * package also defines server functions that return the access token.
 *
 * Each gym host has its own host-only cookie. A member session never reaches
 * the staff portal, and the site calls only `/member/*` and `/public/*`.
 */
import { env } from "cloudflare:workers";
import { configure } from "@workos/authkit-session";
import { authkitMiddleware, getAuthkit, getAuthKitContextOrNull } from "@workos/authkit-tanstack-react-start";
import { SIGN_OUT_PATH } from "./boundary";
import { parseBaseDomains, resolveSiteHost } from "./host";
import {
  gymAuthOrigins,
  resolveMemberAccess,
  safeReturnPath,
  toBrowserUrl,
  workosBrowserOrigin,
  workosSetting,
  type MemberAccess,
  type SiteEnv,
} from "./member-access";

const dev = import.meta.env.DEV;

function siteEnv(): SiteEnv {
  return env as SiteEnv;
}

export function currentMemberAccess(): MemberAccess {
  return resolveMemberAccess({ dev, env: siteEnv() });
}

/** True when the request host names a gym. Sign-in never starts on other hosts. */
function isGymHost(request: Request): boolean {
  const host = resolveSiteHost(new URL(request.url).host, {
    baseDomains: parseBaseDomains(siteEnv().SITE_BASE_DOMAINS),
    allowLocalhost: dev,
  });
  return host.kind === "gym";
}

/** Extra CSP `form-action` origins: the WorkOS sign-out page, when sign-in is on. */
export function formTargets(): string[] {
  return currentMemberAccess().kind === "workos" ? [workosBrowserOrigin({ dev, env: siteEnv() })] : [];
}

let configured = false;

function configureWorkos() {
  if (configured) return;
  configure((name: string) => workosSetting(name, { dev, env: siteEnv() }));
  configured = true;
}

const sdkMiddleware = authkitMiddleware();
type SdkServer = (args: unknown) => Promise<unknown>;

/**
 * The body of the WorkOS request middleware. Runs the SDK middleware only on
 * a gym host with sign-in on. Sign-out skips it, so a refresh cannot write
 * the cookie again after sign-out cleared it.
 */
export function runWorkosMiddleware<T extends { request: Request; next: () => unknown }>(args: T): ReturnType<T["next"]> {
  if (currentMemberAccess().kind !== "workos" || !isGymHost(args.request) || new URL(args.request.url).pathname === SIGN_OUT_PATH) {
    return args.next() as ReturnType<T["next"]>;
  }
  configureWorkos();
  return (sdkMiddleware.options.server as unknown as SdkServer)(args) as ReturnType<T["next"]>;
}

/** The signed-in person, as safe display data. Never holds a token. */
export interface SignedInPerson {
  name: string;
  email: string;
}

function auth() {
  const context = getAuthKitContextOrNull();
  if (!context) return null;
  const value = context.auth();
  return value.user && value.accessToken ? value : null;
}

export function signedInPerson(): SignedInPerson | null {
  const value = auth();
  if (!value?.user) return null;
  const { firstName, lastName, email } = value.user;
  return { name: [firstName, lastName].filter(Boolean).join(" ") || email, email };
}

/** The access token for Rails. Server only; never return it from a server function. */
export function currentAccessToken(): string | null {
  return auth()?.accessToken ?? null;
}

/** Starts sign-in on this gym host. `null` when sign-in cannot start here. */
export async function signInUrl(request: Request, returnTo: string | null): Promise<string | null> {
  if (!isGymHost(request)) return null;
  const origins = gymAuthOrigins(request.url, { dev, env: siteEnv() });
  if (!origins) return null;
  configureWorkos();
  const authkit = await getAuthkit();
  const { url } = await authkit.createSignIn(undefined, {
    returnPathname: safeReturnPath(returnTo),
    redirectUri: origins.redirectUri,
  });
  return toBrowserUrl(url, { dev, env: siteEnv() });
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

/** Clears the cookie and returns where to send the browser: WorkOS logout, then this gym's home page. */
export async function signOut(request: Request): Promise<{ location: string; cookies: string[] }> {
  configureWorkos();
  const home = gymAuthOrigins(request.url, { dev, env: siteEnv() })?.home ?? "/";
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
    return { location: home, cookies: cleared.response?.headers.getSetCookie() ?? headerList(cleared.headers) };
  }
  const { logoutUrl, response, headers } = await authkit.signOut(sessionId, { returnTo: home });
  return { location: toBrowserUrl(logoutUrl, { dev, env: siteEnv() }), cookies: response?.headers.getSetCookie() ?? headerList(headers) };
}

function headerList(headers: Record<string, string | string[]> | undefined): string[] {
  const value = headers?.["Set-Cookie"];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export { safeReturnPath };

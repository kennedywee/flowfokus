/**
 * Decides whether member sign-in is on, which WorkOS settings the AuthKit SDK
 * may see, and where sign-in returns for a gym host.
 *
 * Pure functions only, so tests can check every case. Server code only.
 * The rules match the portal (`apps/portal/src/server/access.ts`), with one
 * difference: each gym host gets its own callback, built from the host.
 */

const MIN_COOKIE_PASSWORD_LENGTH = 32;

/** Session cookie names. Browsers accept `__Host-` only with `Secure`, so plain-HTTP development uses the bare name. */
export const SESSION_COOKIE = "__Host-hf_session";
export const LOCAL_SESSION_COOKIE = "hf_session";

export const CALLBACK_PATH = "/callback";

export interface SiteEnv {
  API_BASE_URL?: string;
  SITE_BASE_DOMAINS?: string;
  WORKER_SECRET?: string;
  WORKOS_CLIENT_ID?: string;
  WORKOS_API_KEY?: string;
  /** Any valid gym callback. The SDK needs one; each request passes its own. */
  WORKOS_REDIRECT_URI?: string;
  WORKOS_COOKIE_PASSWORD?: string;
  /** Production only: "true" after a person verified a real WorkOS environment end to end. */
  WORKOS_VERIFIED?: string;
  /** Development only: a local WorkOS emulator. Ignored by production builds. */
  WORKOS_API_HOSTNAME?: string;
  WORKOS_API_PORT?: string;
  WORKOS_API_HTTPS?: string;
  /** Development only: the emulator origin as the browser reaches it. */
  WORKOS_BROWSER_URL?: string;
}

/** Why member sign-in is off. Safe to show in the browser. */
export type SignInOffReason = "sign_in_not_configured" | "sign_in_misconfigured" | "sign_in_not_verified";

export type MemberAccess = { kind: "workos" } | { kind: "unavailable"; reason: SignInOffReason };

export interface AccessInput {
  /** Pass `import.meta.env.DEV`, so production bundles drop the emulator branches. */
  dev: boolean;
  env: SiteEnv;
}

function isUrl(value: string | undefined, protocol?: string): boolean {
  try {
    const url = new URL(value ?? "");
    return protocol ? url.protocol === protocol : true;
  } catch {
    return false;
  }
}

export function resolveMemberAccess({ dev, env }: AccessInput): MemberAccess {
  if (!env.WORKOS_CLIENT_ID || !env.WORKOS_COOKIE_PASSWORD || !env.WORKOS_REDIRECT_URI) {
    return { kind: "unavailable", reason: "sign_in_not_configured" };
  }
  if (env.WORKOS_COOKIE_PASSWORD.length < MIN_COOKIE_PASSWORD_LENGTH || !isUrl(env.WORKOS_REDIRECT_URI)) {
    return { kind: "unavailable", reason: "sign_in_misconfigured" };
  }
  if (dev) return { kind: "workos" };

  if (!env.WORKOS_API_KEY || !isUrl(env.WORKOS_REDIRECT_URI, "https:")) return { kind: "unavailable", reason: "sign_in_misconfigured" };
  if (env.WORKOS_VERIFIED !== "true") return { kind: "unavailable", reason: "sign_in_not_verified" };
  return { kind: "workos" };
}

/**
 * The settings the AuthKit SDK reads. Anything not listed reads as unset. The
 * cookie is always host-only: `WORKOS_COOKIE_DOMAIN` is never passed, so each
 * gym host keeps its own session. Production keeps the SDK on WorkOS over HTTPS.
 */
export function workosSetting(name: string, { dev, env }: AccessInput): string | undefined {
  switch (name) {
    case "WORKOS_CLIENT_ID":
    case "WORKOS_API_KEY":
    case "WORKOS_REDIRECT_URI":
    case "WORKOS_COOKIE_PASSWORD":
      return env[name] || undefined;
    case "WORKOS_COOKIE_NAME":
      return isUrl(env.WORKOS_REDIRECT_URI, "https:") ? SESSION_COOKIE : LOCAL_SESSION_COOKIE;
    case "WORKOS_COOKIE_SAME_SITE":
      return "lax";
    case "WORKOS_API_HOSTNAME":
    case "WORKOS_API_PORT":
    case "WORKOS_API_HTTPS":
      return dev ? env[name] || undefined : undefined;
    default:
      return undefined;
  }
}

/**
 * The callback and home page for a gym host that `resolveSiteHost` accepted.
 * Production needs HTTPS. Development keeps the scheme and port of the
 * configured callback. Only the request URL is read, never forwarded headers.
 */
export function gymAuthOrigins(requestUrl: string, { dev, env }: AccessInput): { redirectUri: string; home: string } | null {
  const current = new URL(requestUrl);
  if (!dev && current.protocol !== "https:") return null;
  if (dev) {
    if (!isUrl(env.WORKOS_REDIRECT_URI)) return null;
    const configured = new URL(env.WORKOS_REDIRECT_URI ?? "");
    if (current.protocol !== configured.protocol || current.port !== configured.port) return null;
  }
  return { redirectUri: new URL(CALLBACK_PATH, current.origin).toString(), home: new URL("/", current.origin).toString() };
}

/** Moves an emulator URL from its internal address to the browser address. Development only. */
export function toBrowserUrl(url: string, { dev, env }: AccessInput): string {
  if (!dev || !env.WORKOS_BROWSER_URL || !env.WORKOS_API_HOSTNAME) return url;
  const scheme = env.WORKOS_API_HTTPS === "false" ? "http:" : "https:";
  const internal = new URL(`${scheme}//${env.WORKOS_API_HOSTNAME}${env.WORKOS_API_PORT ? `:${env.WORKOS_API_PORT}` : ""}`);
  const target = new URL(url);
  if (target.origin !== internal.origin) return url;
  const browser = new URL(env.WORKOS_BROWSER_URL);
  target.protocol = browser.protocol;
  target.host = browser.host;
  return target.toString();
}

export const WORKOS_API_ORIGIN = "https://api.workos.com";

/** The origin a sign-out form ends at, for the CSP `form-action`. */
export function workosBrowserOrigin({ dev, env }: AccessInput): string {
  if (dev && isUrl(env.WORKOS_BROWSER_URL)) return new URL(env.WORKOS_BROWSER_URL ?? "").origin;
  return WORKOS_API_ORIGIN;
}

/** A same-origin path to return to after sign-in. Anything else becomes `/account`. */
export function safeReturnPath(value: string | null | undefined): string {
  const fallback = "/account";
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "http://site.invalid");
    if (parsed.origin !== "http://site.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

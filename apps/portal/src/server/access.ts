/**
 * Decides how the portal Worker may call `/staff/*` on Rails, and which WorkOS
 * settings the AuthKit SDK may see.
 *
 * Pure functions only. The caller passes the build mode and the Worker
 * environment, so tests can check every case. Server code only: the result
 * can hold the demo token, which must never reach the browser.
 */

export const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:4000";
const MIN_DEMO_TOKEN_LENGTH = 16;
const MIN_COOKIE_PASSWORD_LENGTH = 32;

/** Session cookie names. Browsers accept `__Host-` only with `Secure`, so plain-HTTP development uses the bare name. */
export const SESSION_COOKIE = "__Host-hf_session";
export const LOCAL_SESSION_COOKIE = "hf_session";

export interface PortalEnv {
  API_BASE_URL?: string;
  FLOWFOKUS_DEMO_MODE?: string;
  FLOWFOKUS_DEMO_TOKEN?: string;
  WORKER_SECRET?: string;
  WORKOS_CLIENT_ID?: string;
  WORKOS_API_KEY?: string;
  WORKOS_REDIRECT_URI?: string;
  WORKOS_COOKIE_PASSWORD?: string;
  /** Production only: "true" after a person verified a real WorkOS environment end to end. */
  WORKOS_VERIFIED?: string;
  /** Development only: a local WorkOS emulator. Ignored by production builds. */
  WORKOS_API_HOSTNAME?: string;
  WORKOS_API_PORT?: string;
  WORKOS_API_HTTPS?: string;
  /** Development only: the emulator origin as the browser reaches it, for example `http://localhost:4100`. */
  WORKOS_BROWSER_URL?: string;
}

/** Why protected actions are not available. Safe to show in the browser. */
export type UnavailableReason =
  /** No WorkOS settings. Production without credentials. */
  | "sign_in_not_configured"
  /** WorkOS settings exist, but are incomplete or unsafe for this build. */
  | "sign_in_misconfigured"
  /** Production WorkOS settings exist, but nobody has verified them yet. */
  | "sign_in_not_verified"
  /** Demo mode is on, but the token is missing or too short. */
  | "demo_token_invalid";

export type StaffAccess =
  | { kind: "demo"; token: string }
  | { kind: "workos" }
  | { kind: "unavailable"; reason: UnavailableReason };

/** What the browser may know about access. Never holds a token. */
export type PublicAccess =
  | { kind: "demo" }
  | { kind: "workos" }
  | { kind: "unavailable"; reason: UnavailableReason };

export interface AccessInput {
  /**
   * True only in a Vite development build. Pass `import.meta.env.DEV`, which
   * Vite replaces with `false` in production builds, so the demo and emulator
   * branches are removed from the production bundle.
   */
  dev: boolean;
  env: PortalEnv;
}

function workosConfigured(env: PortalEnv): boolean {
  return Boolean(env.WORKOS_CLIENT_ID && env.WORKOS_COOKIE_PASSWORD && env.WORKOS_REDIRECT_URI);
}

function isHttpsUrl(value: string | undefined): boolean {
  try {
    return new URL(value ?? "").protocol === "https:";
  } catch {
    return false;
  }
}

function isUrl(value: string | undefined): boolean {
  try {
    new URL(value ?? "");
    return true;
  } catch {
    return false;
  }
}

export function resolveStaffAccess({ dev, env }: AccessInput): StaffAccess {
  // Demo access needs a development build and the explicit flag. The flag wins
  // over WorkOS settings, so a developer can opt in without editing them.
  if (dev && env.FLOWFOKUS_DEMO_MODE === "true") {
    const token = env.FLOWFOKUS_DEMO_TOKEN ?? "";
    if (token.length < MIN_DEMO_TOKEN_LENGTH) {
      return { kind: "unavailable", reason: "demo_token_invalid" };
    }
    return { kind: "demo", token };
  }

  if (dev) {
    if (!workosConfigured(env)) return { kind: "unavailable", reason: "sign_in_not_configured" };
    if ((env.WORKOS_COOKIE_PASSWORD ?? "").length < MIN_COOKIE_PASSWORD_LENGTH || !isUrl(env.WORKOS_REDIRECT_URI)) {
      return { kind: "unavailable", reason: "sign_in_misconfigured" };
    }
    return { kind: "workos" };
  }

  return resolveProductionAccess(env);
}

/**
 * Access in a production build. It has no demo or emulator path at all,
 * whatever the environment says. Real WorkOS needs an API key, an HTTPS
 * callback, and an explicit `WORKOS_VERIFIED=true` after a staging check.
 */
export function resolveProductionAccess(env: PortalEnv): StaffAccess {
  if (!workosConfigured(env)) return { kind: "unavailable", reason: "sign_in_not_configured" };
  if (
    !env.WORKOS_API_KEY ||
    (env.WORKOS_COOKIE_PASSWORD ?? "").length < MIN_COOKIE_PASSWORD_LENGTH ||
    !isHttpsUrl(env.WORKOS_REDIRECT_URI)
  ) {
    return { kind: "unavailable", reason: "sign_in_misconfigured" };
  }
  if (env.WORKOS_VERIFIED !== "true") return { kind: "unavailable", reason: "sign_in_not_verified" };
  return { kind: "workos" };
}

export function toPublicAccess(access: StaffAccess): PublicAccess {
  return access.kind === "unavailable" ? { kind: "unavailable", reason: access.reason } : { kind: access.kind };
}

/**
 * The settings the AuthKit SDK reads, by environment variable name. Anything
 * not listed here reads as unset.
 *
 * - Production keeps the SDK on `api.workos.com` over HTTPS: the emulator
 *   host, port, and HTTP settings are dropped.
 * - The cookie is always host-only: `WORKOS_COOKIE_DOMAIN` is never passed.
 * - The cookie name is `__Host-hf_session` over HTTPS, `hf_session` over plain
 *   HTTP in development.
 */
export function workosSetting(name: string, { dev, env }: AccessInput): string | undefined {
  switch (name) {
    case "WORKOS_CLIENT_ID":
    case "WORKOS_API_KEY":
    case "WORKOS_REDIRECT_URI":
    case "WORKOS_COOKIE_PASSWORD":
      return env[name] || undefined;
    case "WORKOS_COOKIE_NAME":
      return isHttpsUrl(env.WORKOS_REDIRECT_URI) ? SESSION_COOKIE : LOCAL_SESSION_COOKIE;
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
 * In development the Worker reaches the emulator at an internal address (for
 * example `http://workos:4100`) that the browser cannot open. Moves an
 * authorize or logout URL from that address to `WORKOS_BROWSER_URL`. Other
 * URLs, and every URL in a production build, pass through unchanged.
 */
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

/** The WorkOS API origin in production builds. */
export const WORKOS_API_ORIGIN = "https://api.workos.com";

/**
 * The origin the browser opens for WorkOS sign-out. The sign-out form posts to
 * the portal, which redirects there, so the Content Security Policy
 * `form-action` must allow it. Production is always `api.workos.com`.
 */
export function workosBrowserOrigin({ dev, env }: AccessInput): string {
  if (!dev) return WORKOS_API_ORIGIN;
  const candidates = [
    env.WORKOS_BROWSER_URL,
    env.WORKOS_API_HOSTNAME
      ? `${env.WORKOS_API_HTTPS === "false" ? "http" : "https"}://${env.WORKOS_API_HOSTNAME}${env.WORKOS_API_PORT ? `:${env.WORKOS_API_PORT}` : ""}`
      : undefined,
  ];
  for (const candidate of candidates) {
    if (candidate && isUrl(candidate)) return new URL(candidate).origin;
  }
  return WORKOS_API_ORIGIN;
}

/**
 * A same-origin path to return to after sign-in. Anything else, including
 * protocol-relative (`//host`) and backslash tricks, becomes `/`.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const parsed = new URL(value, "http://portal.invalid");
    if (parsed.origin !== "http://portal.invalid") return "/";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}

/**
 * The Rails base URL. Development falls back to the local Rails server.
 * Production must set `API_BASE_URL`; without it, calls fail closed.
 */
export function resolveApiBaseUrl(dev: boolean, env: PortalEnv): string | undefined {
  const configured = env.API_BASE_URL?.trim();
  if (configured) return configured;
  return dev ? DEFAULT_LOCAL_API_BASE_URL : undefined;
}

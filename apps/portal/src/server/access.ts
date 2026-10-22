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
  /**
   * Development only: comma-separated hosts the browser may use for sign-in,
   * for example `localhost,127.0.0.1,100.89.45.88`. Only loopback, private,
   * and Tailscale hosts count. Production builds ignore it.
   */
  FLOWFOKUS_DEV_AUTH_HOSTS?: string;
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
export function toBrowserUrl(url: string, { dev, env }: AccessInput, browserUrl = env.WORKOS_BROWSER_URL): string {
  if (!dev || !browserUrl || !env.WORKOS_API_HOSTNAME) return url;
  const scheme = env.WORKOS_API_HTTPS === "false" ? "http:" : "https:";
  const internal = new URL(`${scheme}//${env.WORKOS_API_HOSTNAME}${env.WORKOS_API_PORT ? `:${env.WORKOS_API_PORT}` : ""}`);
  const target = new URL(url);
  if (target.origin !== internal.origin) return url;
  const browser = new URL(browserUrl);
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
export function workosBrowserOrigin({ dev, env }: AccessInput, browserUrl = env.WORKOS_BROWSER_URL): string {
  if (!dev) return WORKOS_API_ORIGIN;
  const candidates = [
    browserUrl,
    env.WORKOS_API_HOSTNAME
      ? `${env.WORKOS_API_HTTPS === "false" ? "http" : "https"}://${env.WORKOS_API_HOSTNAME}${env.WORKOS_API_PORT ? `:${env.WORKOS_API_PORT}` : ""}`
      : undefined,
  ];
  for (const candidate of candidates) {
    if (candidate && isUrl(candidate)) return new URL(candidate).origin;
  }
  return WORKOS_API_ORIGIN;
}

/** Hosts allowed for development sign-in when `FLOWFOKUS_DEV_AUTH_HOSTS` is unset. */
export const DEFAULT_DEV_AUTH_HOSTS = "localhost,127.0.0.1,::1";

/**
 * True for a host that only this machine or its private network can reach:
 * `localhost` and `*.localhost`, IPv4 loopback, RFC 1918 private ranges, the
 * Tailscale range `100.64.0.0/10`, IPv6 loopback, IPv6 unique local addresses
 * (`fc00::/7`, Tailscale uses `fd7a:115c:a1e0::/48`), and Tailscale MagicDNS
 * names (`*.ts.net`). Takes a URL hostname: lowercase, IPv6 in brackets.
 */
export function isPrivateDevHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".ts.net")) return true;
  if (hostname === "[::1]") return true;
  if (/^\[f[cd][0-9a-f]{2}:/.test(hostname)) return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!ipv4) return false;
  const [a = 0, b = 0] = ipv4.slice(1, 3).map(Number);
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Reads one `FLOWFOKUS_DEV_AUTH_HOSTS` entry as a URL hostname, or `null` when it is not a bare host. */
function devAuthHostname(entry: string): string | null {
  const host = entry.trim().toLowerCase();
  if (!host) return null;
  const bracketed = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  try {
    const url = new URL(`http://${bracketed}`);
    // Refuse ports, paths, and credentials: the entry must be the host alone.
    if (url.host !== url.hostname || url.pathname !== "/" || url.username || url.search || url.hash) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * The hosts a browser may use for development sign-in. Entries that are not
 * private (see `isPrivateDevHost`) are dropped, so a public name in the list
 * never becomes a callback.
 */
export function devAuthHosts(env: PortalEnv): Set<string> {
  const hosts = new Set<string>();
  for (const entry of (env.FLOWFOKUS_DEV_AUTH_HOSTS ?? DEFAULT_DEV_AUTH_HOSTS).split(",")) {
    const hostname = devAuthHostname(entry);
    if (hostname && isPrivateDevHost(hostname)) hosts.add(hostname);
  }
  return hosts;
}

/** Where sign-in, the callback, and sign-out lead for one request. */
export interface AuthOrigins {
  /** False in development when the request host may not sign in. Always true in production. */
  allowed: boolean;
  /** The WorkOS `redirect_uri`: the portal callback. */
  redirectUri: string;
  /** The portal start page. WorkOS returns here after sign-out. */
  home: string;
  /** Development only: the emulator origin for this browser. */
  browserUrl: string | undefined;
}

/**
 * Picks the callback and return addresses for a request.
 *
 * Production always uses `WORKOS_REDIRECT_URI` and its origin, whatever host
 * the request names.
 *
 * Development follows the address the browser used, so sign-in works from
 * `localhost` and from this machine's Tailscale or private IP. The request host
 * must be in `FLOWFOKUS_DEV_AUTH_HOSTS` (private hosts only), and the scheme
 * and port must match `WORKOS_REDIRECT_URI`. The emulator address keeps the
 * scheme and port of `WORKOS_BROWSER_URL` and takes the request host. Any other
 * host gets the configured addresses and `allowed: false`. Only the request URL is read;
 * `X-Forwarded-Host` and similar headers are ignored.
 */
export function resolveAuthOrigins(request: Request, { dev, env }: AccessInput): AuthOrigins {
  const configured = new URL(env.WORKOS_REDIRECT_URI ?? "");
  const fallback: AuthOrigins = {
    allowed: !dev,
    redirectUri: configured.toString(),
    home: new URL("/", configured).toString(),
    browserUrl: dev ? env.WORKOS_BROWSER_URL : undefined,
  };
  if (!dev) return fallback;

  const current = new URL(request.url);
  if (current.protocol !== configured.protocol || current.port !== configured.port) return fallback;
  if (current.hostname !== configured.hostname && !devAuthHosts(env).has(current.hostname)) return fallback;

  const redirect = new URL(configured);
  redirect.hostname = current.hostname;
  let browserUrl = env.WORKOS_BROWSER_URL;
  if (browserUrl && isUrl(browserUrl)) {
    const browser = new URL(browserUrl);
    browser.hostname = current.hostname;
    browserUrl = browser.origin;
  }
  return { allowed: true, redirectUri: redirect.toString(), home: new URL("/", redirect).toString(), browserUrl };
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

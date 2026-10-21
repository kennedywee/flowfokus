/**
 * Decides how the portal Worker may call `/staff/*` on Rails.
 *
 * Pure functions only. The caller passes the build mode and the Worker
 * environment, so tests can check every case. Server code only: the result
 * can hold the demo token, which must never reach the browser.
 */

export const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:4000";
const MIN_DEMO_TOKEN_LENGTH = 16;

export interface PortalEnv {
  API_BASE_URL?: string;
  FLOWFOKUS_DEMO_MODE?: string;
  FLOWFOKUS_DEMO_TOKEN?: string;
  WORKER_SECRET?: string;
  WORKOS_CLIENT_ID?: string;
  WORKOS_API_KEY?: string;
  WORKOS_REDIRECT_URI?: string;
  WORKOS_COOKIE_PASSWORD?: string;
}

/** Why protected actions are not available. Safe to show in the browser. */
export type UnavailableReason =
  /** No WorkOS settings. Production without credentials. */
  | "sign_in_not_configured"
  /** WorkOS settings exist, but the integration ships next sprint. */
  | "sign_in_not_integrated"
  /** Demo mode is on, but the token is missing or too short. */
  | "demo_token_invalid";

export type StaffAccess =
  | { kind: "demo"; token: string }
  | { kind: "unavailable"; reason: UnavailableReason };

/** What the browser may know about access. Never holds a token. */
export type PublicAccess =
  | { kind: "demo" }
  | { kind: "unavailable"; reason: UnavailableReason };

export interface AccessInput {
  /**
   * True only in a Vite development build. Pass `import.meta.env.DEV`, which
   * Vite replaces with `false` in production builds, so the demo branch is
   * removed from the production bundle.
   */
  dev: boolean;
  env: PortalEnv;
}

function workosConfigured(env: PortalEnv): boolean {
  return Boolean(env.WORKOS_CLIENT_ID && env.WORKOS_API_KEY && env.WORKOS_COOKIE_PASSWORD);
}

export function resolveStaffAccess({ dev, env }: AccessInput): StaffAccess {
  // Demo access needs a development build and the explicit flag.
  // Development hosts can be reached through localhost, LAN, or Tailscale.
  if (dev && env.FLOWFOKUS_DEMO_MODE === "true") {
    const token = env.FLOWFOKUS_DEMO_TOKEN ?? "";
    if (token.length < MIN_DEMO_TOKEN_LENGTH) {
      return { kind: "unavailable", reason: "demo_token_invalid" };
    }
    return { kind: "demo", token };
  }

  return resolveProductionAccess(env);
}

/**
 * Access in a production build. It has no demo path at all, whatever the
 * environment says. WorkOS AuthKit sessions are next sprint; until then,
 * fail closed and say why.
 */
export function resolveProductionAccess(env: PortalEnv): StaffAccess {
  if (workosConfigured(env)) return { kind: "unavailable", reason: "sign_in_not_integrated" };
  return { kind: "unavailable", reason: "sign_in_not_configured" };
}

export function toPublicAccess(access: StaffAccess): PublicAccess {
  return access.kind === "demo" ? { kind: "demo" } : { kind: "unavailable", reason: access.reason };
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

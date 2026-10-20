/**
 * Chooses the gym from the request host. Pure functions; server code only.
 *
 * - `<slug>.flowfokus.com` and, in development, `<slug>.localhost` name a gym.
 * - Plain `localhost` in development shows setup instructions.
 * - Every other host is rejected. Hosts are never mapped to a default gym.
 */

/** Names that can never be a gym slug. Matches docs/authentication.md. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "about",
  "account",
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "callback",
  "cdn",
  "dashboard",
  "dev",
  "docs",
  "help",
  "flowfokus",
  "localhost",
  "login",
  "logout",
  "mail",
  "member",
  "members",
  "portal",
  "public",
  "root",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "staff",
  "staging",
  "static",
  "status",
  "support",
  "test",
  "webhooks",
  "www",
]);

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const LOCAL_BASE = "localhost";

export type HostResolution =
  | { kind: "gym"; slug: string }
  /** Plain `localhost` in development: explain how to open a gym. */
  | { kind: "setup" }
  | { kind: "rejected"; reason: "malformed" | "reserved" | "unknown_domain" };

export interface HostOptions {
  /** Base domains for gym sites, for example `["flowfokus.com"]`. */
  baseDomains: readonly string[];
  /** True in development. Adds `localhost` as a base domain. */
  allowLocalhost: boolean;
}

/** Lowercases the host and removes the port and one trailing dot. `null` if malformed. */
export function normalizeHost(host: string): string | null {
  const value = host.trim().toLowerCase();
  if (!value || value.length > 260) return null;
  if (value.startsWith("[")) return null; // IPv6 literal: never a gym.
  const match = /^([^:]+)(?::(\d{1,5}))?$/.exec(value);
  if (!match?.[1]) return null;
  const name = match[1].replace(/\.$/, "");
  if (name.length > 253 || !/^[a-z0-9.-]+$/.test(name)) return null;
  if (name.split(".").some((label) => label.length === 0 || label.length > 63)) return null;
  return name;
}

export function isValidSlug(slug: string): boolean {
  return SLUG.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function resolveSiteHost(host: string | null | undefined, options: HostOptions): HostResolution {
  const name = host ? normalizeHost(host) : null;
  if (!name) return { kind: "rejected", reason: "malformed" };

  const bases = options.allowLocalhost ? [...options.baseDomains, LOCAL_BASE] : [...options.baseDomains];
  for (const base of bases) {
    if (name === base) {
      return base === LOCAL_BASE ? { kind: "setup" } : { kind: "rejected", reason: "unknown_domain" };
    }
    if (!name.endsWith(`.${base}`)) continue;

    const slug = name.slice(0, -(base.length + 1));
    // One label only: `a.b.flowfokus.com` is not a gym.
    if (!SLUG.test(slug)) return { kind: "rejected", reason: "malformed" };
    if (RESERVED_SLUGS.has(slug)) return { kind: "rejected", reason: "reserved" };
    return { kind: "gym", slug };
  }
  return { kind: "rejected", reason: "unknown_domain" };
}

/** Parses `SITE_BASE_DOMAINS`, a comma-separated list. Defaults to `flowfokus.com`. */
export function parseBaseDomains(value: string | undefined): string[] {
  const domains = (value ?? "flowfokus.com")
    .split(",")
    .map((domain) => normalizeHost(domain))
    .filter((domain): domain is string => domain !== null);
  return domains.length ? domains : ["flowfokus.com"];
}

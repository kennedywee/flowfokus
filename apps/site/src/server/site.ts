/**
 * The gym site's only path to Rails. Server code only.
 *
 * It calls `/public/*` with no credential, and `/member/*` with the signed-in
 * member's Bearer token from the session cookie. It never calls `/staff/*`.
 * The gym slug comes from the request host, never from browser input.
 */
import { env } from "cloudflare:workers";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { createFlowfokusClient, isErrorBody, type FlowfokusClient, type Schemas } from "@flowfokus/api";
import { parseBaseDomains, resolveSiteHost, type HostResolution } from "./host";
import type { SignedInPerson } from "./member-auth";

const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:4000";

export type SitePage =
  | { kind: "gym"; organization: Schemas["PublicOrganization"]; products: Schemas["PublicProduct"][] }
  | { kind: "setup"; port: string }
  | { kind: "rejected"; reason: Extract<HostResolution, { kind: "rejected" }>["reason"] }
  | { kind: "not_found" }
  | { kind: "unavailable" };

export function currentHost(): HostResolution {
  const url = new URL(getRequest().url);
  return resolveSiteHost(url.host, {
    baseDomains: parseBaseDomains(env.SITE_BASE_DOMAINS),
    allowLocalhost: import.meta.env.DEV,
  });
}

function publicClient(slug: string, token?: string): FlowfokusClient | null {
  const baseUrl = env.API_BASE_URL?.trim() || (import.meta.env.DEV ? DEFAULT_LOCAL_API_BASE_URL : "");
  if (!baseUrl) return null;
  const clientIp = getRequest().headers.get("CF-Connecting-IP") ?? undefined;
  return createFlowfokusClient({
    baseUrl,
    organization: slug,
    ...(token ? { token } : {}),
    ...(env.WORKER_SECRET ? { workerSecret: env.WORKER_SECRET, clientIp } : {}),
  });
}

/** The member area page, from the session and Rails. Never holds a token. */
export type AccountPage =
  | { kind: "off"; reason: "sign_in_not_configured" | "sign_in_misconfigured" | "sign_in_not_verified" }
  | { kind: "signed_out" }
  | { kind: "not_linked"; person: SignedInPerson }
  | { kind: "account"; person: SignedInPerson; account: Schemas["MemberAccount"] }
  | { kind: "error"; message: string };

export type LinkResult = { ok: true } | { ok: false; code: string; message: string };

async function memberCall<T>(
  run: (api: FlowfokusClient) => Promise<{ data?: { data: T }; error?: unknown; response: Response }>,
): Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }> {
  const host = currentHost();
  if (host.kind !== "gym") return { ok: false, code: "not_found", message: "This address is not a gym site." };
  const { currentAccessToken } = await import("./member-auth");
  const token = currentAccessToken();
  if (!token) return { ok: false, code: "signed_out", message: "Your session has ended. Sign in again." };
  const api = publicClient(host.slug, token);
  if (!api) return { ok: false, code: "api_not_configured", message: "The site cannot reach Flowfokus right now." };
  try {
    const outcome = await run(api);
    if (outcome.data !== undefined) return { ok: true, data: outcome.data.data };
    if (isErrorBody(outcome.error)) return { ok: false, code: outcome.error.error.code, message: outcome.error.error.message };
  } catch {
    // Network failure.
  }
  return { ok: false, code: "api_unreachable", message: "Flowfokus did not respond. Try again in a moment." };
}

export async function loadAccountPage(): Promise<AccountPage> {
  const { currentMemberAccess, signedInPerson } = await import("./member-auth");
  const access = currentMemberAccess();
  if (access.kind !== "workos") return { kind: "off", reason: access.reason };
  const person = signedInPerson();
  if (!person) return { kind: "signed_out" };

  const result = await memberCall((api) => api.GET("/member/account"));
  if (result.ok) return { kind: "account", person, account: result.data };
  if (result.code === "member_not_linked") return { kind: "not_linked", person };
  if (result.code === "signed_out" || result.code === "unauthenticated" || result.code === "invalid_token") return { kind: "signed_out" };
  return { kind: "error", message: result.message };
}

/** Links the signed-in person to a member with the code from the desk. */
export async function linkMember(code: string): Promise<LinkResult> {
  const result = await memberCall((api) => api.POST("/member/link", { body: { code } }));
  return result.ok ? { ok: true } : { ok: false, code: result.code, message: result.message };
}

/** Who is signed in on this gym host, for the header. */
export async function currentSession(): Promise<{ signInOn: boolean; person: SignedInPerson | null }> {
  const { currentMemberAccess, signedInPerson } = await import("./member-auth");
  const signInOn = currentMemberAccess().kind === "workos" && currentHost().kind === "gym";
  return { signInOn, person: signInOn ? signedInPerson() : null };
}

/** Loads the public page data for the gym named by the host. */
export async function loadSitePage(): Promise<SitePage> {
  const host = currentHost();
  if (host.kind === "setup") {
    return { kind: "setup", port: new URL(getRequest().url).port };
  }
  if (host.kind === "rejected") {
    setResponseStatus(404);
    return { kind: "rejected", reason: host.reason };
  }

  const api = publicClient(host.slug);
  if (!api) {
    setResponseStatus(503);
    return { kind: "unavailable" };
  }

  try {
    const [organization, products] = await Promise.all([
      api.GET("/public/organization"),
      api.GET("/public/products"),
    ]);
    if (organization.data && products.data) {
      return { kind: "gym", organization: organization.data.data, products: products.data.data };
    }
    const error = organization.error ?? products.error;
    if (isErrorBody(error) && error.error.code === "not_found") {
      setResponseStatus(404);
      return { kind: "not_found" };
    }
  } catch {
    // Network failure: fall through to the unavailable page.
  }
  setResponseStatus(503);
  return { kind: "unavailable" };
}

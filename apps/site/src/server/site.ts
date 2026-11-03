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

/** The public schedule for this gym host. */
export type SchedulePage = { kind: "schedule"; schedule: Schemas["PublicSchedule"] } | { kind: "error"; message: string };

export async function loadSchedulePage(): Promise<SchedulePage> {
  const host = currentHost();
  if (host.kind !== "gym") return { kind: "error", message: "This address is not a gym site." };
  const api = publicClient(host.slug);
  if (!api) return { kind: "error", message: "The site cannot reach Flowfokus right now." };
  try {
    const result = await api.GET("/public/schedule", { params: { query: { days: 14 } } });
    if (result.data) return { kind: "schedule", schedule: result.data.data };
  } catch {
    // Network failure.
  }
  return { kind: "error", message: "The schedule did not load. Try again in a minute." };
}

/** Member pages share these states before their own data. */
type MemberGate =
  | { kind: "off" }
  | { kind: "signed_out" }
  | { kind: "not_linked" }
  | { kind: "error"; message: string };

function gateFor(code: string, message: string): MemberGate {
  if (code === "member_not_linked") return { kind: "not_linked" };
  if (code === "signed_out" || code === "unauthenticated" || code === "invalid_token") return { kind: "signed_out" };
  if (code === "not_found") return { kind: "error", message: "This page was not found. It may have been removed." };
  return { kind: "error", message };
}

async function memberGate(): Promise<MemberGate | null> {
  const { currentMemberAccess, signedInPerson } = await import("./member-auth");
  if (currentMemberAccess().kind !== "workos") return { kind: "off" };
  if (!signedInPerson()) return { kind: "signed_out" };
  return null;
}

export type BookingPage = MemberGate | { kind: "options"; options: Schemas["MemberBookingOptions"] };

/** One time of a program, and how the signed-in member could book it. */
export async function loadBookingPage(occurrenceId: string): Promise<BookingPage> {
  const gate = await memberGate();
  if (gate) return gate;
  const result = await memberCall((api) => api.GET("/member/occurrences/{id}", { params: { path: { id: occurrenceId } } }));
  return result.ok ? { kind: "options", options: result.data } : gateFor(result.code, result.message);
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export async function bookWithRight(occurrenceId: string, entitlementId: string): Promise<ActionResult<Schemas["MemberBooking"]>> {
  return memberCall((api) => api.POST("/member/bookings", { body: { occurrence_id: occurrenceId, entitlement_id: entitlementId } }));
}

export async function cancelMemberBooking(bookingId: string): Promise<ActionResult<Schemas["MemberBooking"]>> {
  return memberCall((api) => api.POST("/member/bookings/{id}/cancel", { params: { path: { id: bookingId } } }));
}

/** Opens a checkout. The browser sends the key, so a retry returns the same checkout. */
export async function startCheckout(input: {
  key: string;
  priceId: string;
  occurrenceId?: string;
}): Promise<ActionResult<Schemas["Checkout"]>> {
  return memberCall((api) =>
    api.POST("/member/checkouts", {
      params: { header: { "Idempotency-Key": input.key } },
      body: { price_id: input.priceId, ...(input.occurrenceId ? { occurrence_id: input.occurrenceId } : {}) },
    }),
  );
}

export type CheckoutPage = MemberGate | { kind: "checkout"; checkout: Schemas["Checkout"] };

export async function loadCheckoutPage(checkoutId: string): Promise<CheckoutPage> {
  const gate = await memberGate();
  if (gate) return gate;
  const result = await memberCall((api) => api.GET("/member/checkouts/{id}", { params: { path: { id: checkoutId } } }));
  return result.ok ? { kind: "checkout", checkout: result.data } : gateFor(result.code, result.message);
}

export async function payTestCheckout(checkoutId: string): Promise<ActionResult<Schemas["Checkout"]>> {
  return memberCall((api) => api.POST("/member/checkouts/{id}/test_payment", { params: { path: { id: checkoutId } } }));
}

export async function cancelCheckout(checkoutId: string): Promise<ActionResult<Schemas["Checkout"]>> {
  return memberCall((api) => api.POST("/member/checkouts/{id}/cancel", { params: { path: { id: checkoutId } } }));
}

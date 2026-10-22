/**
 * The only path from the portal Worker to Rails. Server code only.
 *
 * - Calls `/staff/*` through the shared typed client.
 * - Sets `Authorization` and every `Flowfokus-*` header here. Nothing is
 *   copied from the browser request.
 * - With WorkOS, the Bearer token comes from the encrypted session cookie.
 *   The slug in the URL picks the organization. When the session holds
 *   another organization, the Worker asks WorkOS for a token for this one.
 *   WorkOS issues it only for an active membership, and Rails checks that the
 *   token's organization matches the slug.
 */
import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import { createFlowfokusClient, isErrorBody, type FlowfokusClient, type Schemas } from "@flowfokus/api";
import type { Failure, Result } from "../lib/result";
import { resolveApiBaseUrl, type PortalEnv } from "./access";
import { currentAccessToken, currentOrganizationId, currentStaffAccess, refreshFor, signedInUser } from "./workos";

export { currentOrganizationId, currentStaffAccess, signedInUser };

const dev = import.meta.env.DEV;

function portalEnv(): PortalEnv {
  return env as PortalEnv;
}

function failure(status: number, code: Failure["code"], message: string): { ok: false; error: Failure } {
  return { ok: false, error: { status, code, message } };
}

const SIGNED_OUT = failure(401, "signed_out", "Your session has ended. Sign in again.");
const NO_ACCESS = failure(403, "forbidden", "You have no staff access to this organization.");

type ClientResult = { ok: true; api: FlowfokusClient } | { ok: false; error: Failure };

function client(slug: string | null, token: string): ClientResult {
  const workerEnv = portalEnv();
  const baseUrl = resolveApiBaseUrl(dev, workerEnv);
  if (!baseUrl) return failure(503, "api_not_configured", "The API address is not configured.");

  const request = getRequest();
  const clientIp = request.headers.get("CF-Connecting-IP") ?? undefined;
  const api = createFlowfokusClient({
    baseUrl,
    ...(slug ? { organization: slug } : {}),
    token,
    ...(workerEnv.WORKER_SECRET ? { workerSecret: workerEnv.WORKER_SECRET, clientIp } : {}),
  });
  return { ok: true, api };
}

/** The Bearer token for this request, or why there is none. */
function currentToken(): { ok: true; token: string } | { ok: false; error: Failure } {
  const access = currentStaffAccess();
  if (access.kind === "demo") return { ok: true, token: access.token };
  if (access.kind !== "workos") {
    return failure(503, "access_unavailable", "Staff sign-in is not available. Protected actions are turned off.");
  }
  const token = currentAccessToken();
  return token ? { ok: true, token } : SIGNED_OUT;
}

interface ApiOutcome<T> {
  data?: { data: T };
  error?: unknown;
  response: Response;
}

type Attempt<T> = { kind: "done"; result: Result<T> } | { kind: "rails_error"; status: number; code: string; result: Result<T> };

async function attempt<T>(slug: string | null, run: (api: FlowfokusClient) => Promise<ApiOutcome<T>>): Promise<Attempt<T>> {
  const token = currentToken();
  if (!token.ok) return { kind: "done", result: token };
  const made = client(slug, token.token);
  if (!made.ok) return { kind: "done", result: made };

  let outcome: ApiOutcome<T>;
  try {
    outcome = await run(made.api);
  } catch {
    return { kind: "done", result: failure(502, "api_unreachable", "The Flowfokus API did not respond. Try again in a moment.") };
  }

  if (outcome.data !== undefined) return { kind: "done", result: { ok: true, data: outcome.data.data } };
  if (isErrorBody(outcome.error)) {
    const { code, message, details } = outcome.error.error;
    const result: Result<T> = { ok: false, error: { status: outcome.response.status, code, message, ...(details ? { details } : {}) } };
    return { kind: "rails_error", status: outcome.response.status, code, result };
  }
  return { kind: "done", result: failure(outcome.response.status || 502, "unexpected_response", "The API sent an unexpected answer.") };
}

/**
 * The organizations the signed-in user can open, from Rails. Includes the
 * WorkOS organization ID, so keep it on the server.
 */
export async function staffMemberships(): Promise<Result<Schemas["StaffMembership"][]>> {
  const first = await attempt(null, (api) => api.GET("/staff/memberships"));
  if (first.kind === "done") return first.result;
  if (first.status === 401 && currentStaffAccess().kind === "workos") {
    // The token expired after the SDK checked it. Refresh once and retry.
    const organizationId = currentOrganizationId();
    if (organizationId && (await refreshFor(organizationId))) {
      return (await attempt(null, (api) => api.GET("/staff/memberships"))).result;
    }
    return SIGNED_OUT;
  }
  return first.result;
}

/** Moves the session to the organization behind `slug`. */
async function switchTo(slug: string): Promise<{ ok: true } | { ok: false; error: Failure }> {
  const memberships = await staffMemberships();
  if (!memberships.ok) return memberships;
  const membership = memberships.data.find((entry) => entry.slug === slug);
  if (!membership) return NO_ACCESS;
  if (membership.workos_organization_id === currentOrganizationId()) return { ok: true };
  return (await refreshFor(membership.workos_organization_id)) ? { ok: true } : NO_ACCESS;
}

/**
 * Runs one Rails call and turns the answer into a `Result`. Network errors and
 * unexpected bodies become failures, never thrown errors or fake success.
 */
export async function callStaff<T>(
  slug: string,
  run: (api: FlowfokusClient) => Promise<ApiOutcome<T>>,
): Promise<Result<T>> {
  const first = await attempt(slug, run);
  if (first.kind === "done" || currentStaffAccess().kind !== "workos") return first.result;

  // Rails refused the token before it ran the action, so one retry is safe.
  if (first.status === 403 && first.code === "organization_mismatch") {
    const switched = await switchTo(slug);
    if (!switched.ok) return switched;
    return (await attempt(slug, run)).result;
  }
  if (first.status === 401) {
    const organizationId = currentOrganizationId();
    if (organizationId && (await refreshFor(organizationId))) return (await attempt(slug, run)).result;
    return SIGNED_OUT;
  }
  return first.result;
}

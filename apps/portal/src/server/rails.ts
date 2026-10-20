/**
 * The only path from the portal Worker to Rails. Server code only.
 *
 * - Calls `/staff/*` through the shared typed client.
 * - Sets `Authorization` and every `Flowfokus-*` header here. Nothing is
 *   copied from the browser request.
 */
import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import { createFlowfokusClient, isErrorBody, type FlowfokusClient } from "@flowfokus/api";
import type { Failure, Result } from "../lib/result";
import { resolveApiBaseUrl, resolveProductionAccess, resolveStaffAccess, type PortalEnv, type StaffAccess } from "./access";

const dev = import.meta.env.DEV;

function portalEnv(): PortalEnv {
  return env as PortalEnv;
}

export function currentStaffAccess(): StaffAccess {
  // `import.meta.env.DEV` is a build-time constant. Production bundles keep
  // only the second branch, so demo access cannot exist there.
  if (import.meta.env.DEV) {
    const hostname = new URL(getRequest().url).hostname;
    return resolveStaffAccess({ dev: true, env: portalEnv(), hostname });
  }
  return resolveProductionAccess(portalEnv());
}

function failure(status: number, code: Failure["code"], message: string): { ok: false; error: Failure } {
  return { ok: false, error: { status, code, message } };
}

function staffClient(slug: string): { ok: true; api: FlowfokusClient } | { ok: false; error: Failure } {
  const access = currentStaffAccess();
  if (access.kind !== "demo") {
    return failure(503, "access_unavailable", "Staff sign-in is not available. Protected actions are turned off.");
  }
  const workerEnv = portalEnv();
  const baseUrl = resolveApiBaseUrl(dev, workerEnv);
  if (!baseUrl) return failure(503, "api_not_configured", "The API address is not configured.");

  const request = getRequest();
  const clientIp = request.headers.get("CF-Connecting-IP") ?? undefined;
  const api = createFlowfokusClient({
    baseUrl,
    organization: slug,
    token: access.token,
    ...(workerEnv.WORKER_SECRET ? { workerSecret: workerEnv.WORKER_SECRET, clientIp } : {}),
  });
  return { ok: true, api };
}

interface ApiOutcome<T> {
  data?: { data: T };
  error?: unknown;
  response: Response;
}

/**
 * Runs one Rails call and turns the answer into a `Result`. Network errors and
 * unexpected bodies become failures, never thrown errors or fake success.
 */
export async function callStaff<T>(
  slug: string,
  run: (api: FlowfokusClient) => Promise<ApiOutcome<T>>,
): Promise<Result<T>> {
  const client = staffClient(slug);
  if (!client.ok) return client;

  let outcome: ApiOutcome<T>;
  try {
    outcome = await run(client.api);
  } catch {
    return failure(502, "api_unreachable", "The Flowfokus API did not respond. Try again in a moment.");
  }

  if (outcome.data !== undefined) return { ok: true, data: outcome.data.data };
  if (isErrorBody(outcome.error)) {
    const { code, message, details } = outcome.error.error;
    return { ok: false, error: { status: outcome.response.status, code, message, ...(details ? { details } : {}) } };
  }
  return failure(outcome.response.status || 502, "unexpected_response", "The API sent an unexpected answer.");
}

/**
 * The gym site's only path to Rails. Server code only.
 *
 * It calls `/public/*` and nothing else, with no credential. The gym slug
 * comes from the request host, never from browser input.
 */
import { env } from "cloudflare:workers";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { createFlowfokusClient, isErrorBody, type FlowfokusClient, type Schemas } from "@flowfokus/api";
import { parseBaseDomains, resolveSiteHost, type HostResolution } from "./host";

const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:3000";

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

function publicClient(slug: string): FlowfokusClient | null {
  const baseUrl = env.API_BASE_URL?.trim() || (import.meta.env.DEV ? DEFAULT_LOCAL_API_BASE_URL : "");
  if (!baseUrl) return null;
  const clientIp = getRequest().headers.get("CF-Connecting-IP") ?? undefined;
  return createFlowfokusClient({
    baseUrl,
    organization: slug,
    ...(env.WORKER_SECRET ? { workerSecret: env.WORKER_SECRET, clientIp } : {}),
  });
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

import createClient, { type Client, type Middleware } from "openapi-fetch";
import type { components, operations, paths } from "./schema.d.ts";

export type { components, operations, paths };

/** Every schema in `apps/server/openapi.yaml`, by name. Generated, never edited by hand. */
export type Schemas = components["schemas"];
export type ErrorBody = Schemas["ErrorResponse"]["error"];
export type ErrorCode = Schemas["ErrorCode"];
export type Permission = Schemas["Permission"];

export type HydraflowClient = Client<paths>;

export interface HydraflowClientOptions {
  /** Rails base URL, for example `http://localhost:3000`. */
  baseUrl: string;
  /** Gym slug sent as `Hydraflow-Organization`. */
  organization?: string;
  /**
   * Bearer token. Read it on the server only. Pass a function to read a fresh
   * token for each request. Never expose it to browser code.
   */
  token?: string | (() => string | undefined | Promise<string | undefined>);
  /** Sent as `Hydraflow-Worker-Secret` by Worker server code. */
  workerSecret?: string;
  /** Sent as `Hydraflow-Client-IP` together with the Worker secret. */
  clientIp?: string;
  /** Custom fetch, for example a Cloudflare service binding. */
  fetch?: typeof globalThis.fetch;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
}

/**
 * Create a typed client for the Hydraflow Rails API.
 *
 * Use it from server code only. Hydraflow-* headers are always set here and
 * never copied from a browser request.
 */
export function createHydraflowClient(options: HydraflowClientOptions): HydraflowClient {
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  if (options.organization) headers["Hydraflow-Organization"] = options.organization;
  if (options.workerSecret) {
    headers["Hydraflow-Worker-Secret"] = options.workerSecret;
    if (options.clientIp) headers["Hydraflow-Client-IP"] = options.clientIp;
  }

  const client = createClient<paths>({
    baseUrl: options.baseUrl.replace(/\/+$/, ""),
    headers,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const { token } = options;
  if (token !== undefined) {
    const auth: Middleware = {
      async onRequest({ request }) {
        const value = typeof token === "function" ? await token() : token;
        if (value) request.headers.set("Authorization", `Bearer ${value}`);
        return request;
      },
    };
    client.use(auth);
  }

  return client;
}

/** A fresh key for `Idempotency-Key`. Reuse the same key only when retrying the same request. */
export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

/** True when a value looks like a Hydraflow error body. */
export function isErrorBody(value: unknown): value is Schemas["ErrorResponse"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "object" &&
    (value as { error: { code?: unknown } }).error !== null &&
    typeof (value as { error: { code?: unknown } }).error.code === "string"
  );
}

/** Format integer minor units for display, for example `formatMoney(12000, "MYR")`. */
export function formatMoney(amountMinor: number, currency: string, locale = "en-MY"): string {
  const format = new Intl.NumberFormat(locale, { style: "currency", currency });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(amountMinor / 10 ** digits);
}

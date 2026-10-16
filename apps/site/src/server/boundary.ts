/**
 * Request rules and security headers for the gym site Worker.
 *
 * Pure functions, used by the request middleware in `src/start.ts`.
 */

import type { CsrfMiddlewareOptions } from "@tanstack/react-start";

export type HandlerType = "serverFn" | "router";

/**
 * Options for `createCsrfMiddleware()`. Same as Start's built-in default:
 * only server function calls are checked, and they must be same-origin
 * (`Sec-Fetch-Site`, then `Origin`, then `Referer`). Page loads are never
 * checked, so a typed address (`Sec-Fetch-Site: none`) or a link from
 * another site still opens a page.
 */
export const csrfOptions = {
  filter: ({ handlerType }: { handlerType: HandlerType }) => handlerType === "serverFn",
} satisfies CsrfMiddlewareOptions;

/**
 * Checks the method before Start handles a request. Returns a response to
 * send instead, or `null` to continue.
 *
 * The gym site has no writes in Sprint 1: pages and server functions accept
 * GET and HEAD only. Member sign-in and purchases arrive later.
 */
export function rejectUnsafeRequest(request: Request, _handlerType: HandlerType): Response | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return null;
  return plainResponse(405, "Method not allowed", { Allow: "GET, HEAD" });
}

/** A fresh value for the Content Security Policy `nonce-` source. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

/**
 * Content Security Policy. Production allows only same-origin assets and
 * scripts that carry this response's nonce. Development relaxes scripts for
 * the Vite client and hot reload.
 */
export function contentSecurityPolicy(nonce: string, dev: boolean): string {
  const script = dev ? "'self' 'unsafe-inline' 'unsafe-eval'" : `'self' 'nonce-${nonce}'`;
  const connect = dev ? "'self' ws: wss:" : "'self'";
  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Headers added to every site response. Pages are rendered per request and not stored. */
export function securityHeaders(nonce: string, dev: boolean): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(nonce, dev),
    "Cache-Control": "no-store",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

/** Copies a response and sets the given headers. Works on immutable responses. */
export function withHeaders(response: Response, headers: Record<string, string>): Response {
  const next = new Response(response.body, response);
  for (const [name, value] of Object.entries(headers)) next.headers.set(name, value);
  return next;
}

function plainResponse(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

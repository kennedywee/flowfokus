/**
 * Request rules and security headers for the portal Worker.
 *
 * Pure functions, used by the request middleware in `src/start.ts`.
 */

import type { CsrfMiddlewareOptions } from "@tanstack/react-start";

export type HandlerType = "serverFn" | "router";

/** The one page address that accepts POST: the sign-out form. */
export const SIGN_OUT_PATH = "/sign-out";

/**
 * Options for `createCsrfMiddleware()`. Server function calls and the
 * sign-out form must be same-origin (`Sec-Fetch-Site`, then `Origin`, then
 * `Referer`). Page loads are never checked, so a typed address
 * (`Sec-Fetch-Site: none`) or a link from another site still opens a page.
 */
export const csrfOptions = {
  filter: ({ handlerType, pathname }: { handlerType: HandlerType; pathname: string }) =>
    handlerType === "serverFn" || pathname === SIGN_OUT_PATH,
} satisfies CsrfMiddlewareOptions;

/**
 * Checks the method and content type before Start handles a request.
 * Returns a response to send instead, or `null` to continue.
 *
 * - Pages accept only GET and HEAD. The sign-out form also accepts POST.
 * - Server functions accept GET (reads) and POST (writes).
 * - Every server function POST must send `application/json`.
 * - Server functions outside the portal's own files are refused (see
 *   `isAllowedServerFn`).
 *
 * Origin checks are done by `createCsrfMiddleware()`.
 */
export function rejectUnsafeRequest(request: Request, handlerType: HandlerType, dev = false): Response | null {
  const method = request.method.toUpperCase();

  if (handlerType === "router") {
    if (new URL(request.url).pathname === SIGN_OUT_PATH) {
      return method === "POST" ? null : plainResponse(405, "Method not allowed", { Allow: "POST" });
    }
    if (method === "GET" || method === "HEAD") return null;
    return plainResponse(405, "Method not allowed", { Allow: "GET, HEAD" });
  }

  if (!isAllowedServerFn(new URL(request.url).pathname, dev)) return plainResponse(404, "Not found");
  if (method === "GET") return null;
  if (method !== "POST") return plainResponse(405, "Method not allowed", { Allow: "GET, POST" });

  const contentType = request.headers.get("content-type") ?? "";
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") return plainResponse(415, "Writes accept JSON only");
  return null;
}

/** Where Start serves server function calls. */
export const SERVER_FN_BASE = "/_serverFn/";

/**
 * Portal server functions live in `src/lib/<name>.functions.ts`. Development
 * IDs name that file; nothing else may be called.
 */
const DEV_SERVER_FN_FILE = /^\/src\/lib\/[a-z][a-z-]*\.functions\.ts\?tss-serverfn-split$/;
const DEV_SERVER_FN_EXPORT = /^[A-Za-z][A-Za-z0-9]*_createServerFn_handler$/;
const SERVER_FN_ID = /^[A-Za-z0-9_-]+$/;

/**
 * True when a server function call may reach Start. Fails closed.
 *
 * The WorkOS SDK package defines its own server functions, and some return the
 * access token. Production builds never register them, because the portal
 * does not reference them, and Start looks production IDs up in the build
 * manifest only. The development server, though, names a server function by
 * file path and compiles any file it is asked for. So in development, the ID
 * must be canonical base64url JSON that names a portal `*.functions.ts` file.
 * Everything else, including package files, `/@fs/` paths, and
 * percent-encoded IDs, is refused. The ID is read the same way Start reads
 * it: the first path segment after `/_serverFn/`.
 */
export function isAllowedServerFn(pathname: string, dev: boolean): boolean {
  if (!pathname.startsWith(SERVER_FN_BASE)) return false;
  const id = pathname.slice(SERVER_FN_BASE.length).split("/")[0] ?? "";
  if (!SERVER_FN_ID.test(id)) return false;
  if (!dev) return true;
  try {
    const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const text = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    // Refuse IDs that do not round-trip, so no lenient decoder reads them another way.
    const canonical = btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (canonical !== id) return false;
    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(text, (c) => c.charCodeAt(0)))) as Record<string, unknown>;
    const keys = Object.keys(decoded).sort().join(",");
    return (
      keys === "export,file" &&
      typeof decoded.file === "string" &&
      typeof decoded.export === "string" &&
      DEV_SERVER_FN_FILE.test(decoded.file) &&
      DEV_SERVER_FN_EXPORT.test(decoded.export)
    );
  } catch {
    return false;
  }
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
 * the Vite client and hot reload. `formTargets` lists the extra origins a
 * form may end at: the sign-out form redirects to WorkOS.
 */
export function contentSecurityPolicy(nonce: string, dev: boolean, formTargets: readonly string[] = []): string {
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
    ["form-action 'self'", ...formTargets].join(" "),
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Headers added to every portal response. Portal pages are never cached. */
export function securityHeaders(nonce: string, dev: boolean, formTargets: readonly string[] = []): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(nonce, dev, formTargets),
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "same-origin",
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
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store", ...headers },
  });
}

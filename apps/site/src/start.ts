import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { createNonce, csrfOptions, rejectUnsafeRequest, securityHeaders, withHeaders } from "./server/boundary";

const dev = import.meta.env.DEV;

/**
 * Runs first on every request. Rejects methods and content types the site
 * never uses, then adds security headers and a per-response script nonce.
 */
const boundaryMiddleware = createMiddleware().server(async ({ request, handlerType, next }) => {
  const rejected = rejectUnsafeRequest(request, handlerType, dev);
  if (rejected) return withHeaders(rejected, securityHeaders(createNonce(), dev));

  // Loaded here, not at the top, so the browser bundle never includes it.
  const { formTargets } = await import("./server/member-auth");
  const nonce = createNonce();
  const result = await next({ context: { nonce } });
  return { ...result, response: withHeaders(result.response, securityHeaders(nonce, dev, formTargets())) };
});

/** Reads and refreshes the member session cookie on gym hosts. */
const workosMiddleware = createMiddleware().server(async (args) => {
  const { runWorkosMiddleware } = await import("./server/member-auth");
  return runWorkosMiddleware(args);
});

export const startInstance = createStart(() => ({
  // A custom start instance turns off the default CSRF check, so add it back.
  // It rejects server function calls and sign-out posts that are not
  // same-origin. Page loads are not checked. The WorkOS middleware then reads
  // and refreshes the member session cookie.
  requestMiddleware: [
    boundaryMiddleware,
    createCsrfMiddleware(csrfOptions),
    workosMiddleware,
  ],
}));

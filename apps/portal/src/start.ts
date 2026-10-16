import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { createNonce, csrfOptions, rejectUnsafeRequest, securityHeaders, withHeaders } from "./server/boundary";

const dev = import.meta.env.DEV;

/**
 * Runs first on every request. Rejects methods and content types the portal
 * never uses, then adds security headers and a per-response script nonce.
 */
const boundaryMiddleware = createMiddleware().server(async ({ request, handlerType, next }) => {
  const rejected = rejectUnsafeRequest(request, handlerType);
  if (rejected) return withHeaders(rejected, securityHeaders(createNonce(), dev));

  const nonce = createNonce();
  const result = await next({ context: { nonce } });
  return { ...result, response: withHeaders(result.response, securityHeaders(nonce, dev)) };
});

export const startInstance = createStart(() => ({
  // A custom start instance turns off the default CSRF check, so add it back.
  // It rejects server function calls that are not same-origin. Page loads are
  // not checked: a typed address or an outside link must still open a page.
  requestMiddleware: [
    boundaryMiddleware,
    createCsrfMiddleware(csrfOptions),
  ],
}));

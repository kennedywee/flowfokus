import { createFileRoute } from "@tanstack/react-router";

/**
 * Starts WorkOS sign-in. Sets the PKCE verifier cookie, then sends the browser
 * to AuthKit. `?returnTo=/slug/...` picks the page to open after sign-in; only
 * same-origin paths are kept. In development the callback follows the
 * address the browser used, when that host is allowed (see `resolveAuthOrigins`).
 *
 * The SDK loads inside the handler only, so no browser bundle includes it.
 */
export const Route = createFileRoute("/sign-in")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { currentStaffAccess, signInUrl } = await import("../server/workos");
        if (currentStaffAccess().kind !== "workos") return redirectTo("/");
        const returnTo = new URL(request.url).searchParams.get("returnTo");
        const location = await signInUrl(request, returnTo);
        if (!location) return hostNotAllowed();
        return redirectTo(location);
      },
    },
  },
});

function redirectTo(location: string): Response {
  return new Response(null, { status: 307, headers: { Location: location } });
}

/** Development only: the browser used a host that is not in `FLOWFOKUS_DEV_AUTH_HOSTS`. */
function hostNotAllowed(): Response {
  return new Response("Sign-in is not allowed from this address. Add this host to FLOWFOKUS_DEV_AUTH_HOSTS, or use localhost.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

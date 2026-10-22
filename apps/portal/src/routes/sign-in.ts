import { createFileRoute } from "@tanstack/react-router";

/**
 * Starts WorkOS sign-in. Sets the PKCE verifier cookie, then sends the browser
 * to AuthKit. `?returnTo=/slug/...` picks the page to open after sign-in; only
 * same-origin paths are kept.
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
        return redirectTo(await signInUrl(returnTo));
      },
    },
  },
});

function redirectTo(location: string): Response {
  return new Response(null, { status: 307, headers: { Location: location } });
}

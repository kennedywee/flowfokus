import { createFileRoute } from "@tanstack/react-router";

/**
 * Starts member sign-in on this gym host: sets the PKCE verifier cookie, then
 * sends the browser to AuthKit. The callback is this host's `/callback`.
 * `?returnTo=` keeps only same-origin paths.
 */
export const Route = createFileRoute("/auth/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { currentMemberAccess, signInUrl } = await import("../../server/member-auth");
        if (currentMemberAccess().kind !== "workos") return redirectTo("/sign-in");
        const location = await signInUrl(request, new URL(request.url).searchParams.get("returnTo"));
        return location ? redirectTo(location) : new Response("Sign-in is not available on this address.", { status: 404 });
      },
    },
  },
});

function redirectTo(location: string): Response {
  return new Response(null, { status: 307, headers: { Location: location } });
}

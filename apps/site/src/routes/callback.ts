import { createFileRoute } from "@tanstack/react-router";

/**
 * The WorkOS redirect URI on this gym host. The SDK checks the state against
 * the PKCE verifier cookie, exchanges the code, and sets the session cookie.
 * Any failure ends at the account page with no session.
 */
export const Route = createFileRoute("/callback")({
  server: {
    handlers: {
      GET: async (context) => {
        const { currentMemberAccess } = await import("../server/member-auth");
        if (currentMemberAccess().kind !== "workos") return redirectTo("/sign-in");
        const { handleCallbackRoute } = await import("@workos/authkit-tanstack-react-start");
        return handleCallbackRoute({ onError: () => redirectTo("/sign-in?failed=1") })(context);
      },
    },
  },
});

function redirectTo(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

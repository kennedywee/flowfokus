import { createFileRoute } from "@tanstack/react-router";

/**
 * The WorkOS redirect URI. The SDK checks the `state` against the PKCE
 * verifier cookie set at sign-in, exchanges the code, and sets the encrypted
 * session cookie. Any failure, including a state that does not match, ends
 * at the start page with a notice and no session.
 */
export const Route = createFileRoute("/callback")({
  server: {
    handlers: {
      GET: async (context) => {
        const { currentStaffAccess, linkRedirect } = await import("../server/workos");
        if (currentStaffAccess().kind !== "workos") return redirectTo("/");
        const { handleCallbackRoute } = await import("@workos/authkit-tanstack-react-start");
        const response = await handleCallbackRoute({ onError: () => redirectTo("/?sign_in=failed") })(context);
        return linkRedirect(response, context.request);
      },
    },
  },
});

function redirectTo(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

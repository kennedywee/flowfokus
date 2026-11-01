import { createFileRoute } from "@tanstack/react-router";

/**
 * Signs the member out on this gym host. POST only, from a same-origin form.
 * Clears the cookie, then sends the browser to WorkOS to end the WorkOS
 * session. WorkOS returns the browser to this gym's home page.
 */
export const Route = createFileRoute("/sign-out")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { currentMemberAccess, signOut } = await import("../server/member-auth");
        if (currentMemberAccess().kind !== "workos") return seeOther("/", []);
        const { location, cookies } = await signOut(request);
        return seeOther(location, cookies);
      },
    },
  },
});

function seeOther(location: string, cookies: string[]): Response {
  const headers = new Headers({ Location: location });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

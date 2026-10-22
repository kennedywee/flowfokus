import { createFileRoute } from "@tanstack/react-router";

/**
 * Signs out. Accepts POST only, from a same-origin form: the request
 * middleware rejects other methods and the CSRF check rejects other origins.
 * Clears the session cookie, then sends the browser to WorkOS to end the
 * WorkOS session. WorkOS returns the browser to the portal start page.
 */
export const Route = createFileRoute("/sign-out")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { currentStaffAccess, signOut } = await import("../server/workos");
        const home = new URL("/", request.url).toString();
        if (currentStaffAccess().kind !== "workos") return seeOther(home, []);
        const { location, cookies } = await signOut(request, home);
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

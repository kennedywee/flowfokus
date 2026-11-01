import { createServerFn } from "@tanstack/react-start";
import { currentSession, linkMember, loadAccountPage, loadSitePage, type AccountPage, type LinkResult, type SitePage } from "../server/site";

/**
 * Public data for the gym named by the request host. It takes no input, so
 * the browser cannot ask for another gym or another API path.
 */
export const getSitePage = createServerFn({ method: "GET" }).handler(async (): Promise<SitePage> => loadSitePage());

/** Whether member sign-in is on here, and who is signed in. Never holds a token. */
export const getSession = createServerFn({ method: "GET" }).handler(async () => currentSession());

/** The signed-in member's own account on this gym host. */
export const getAccountPage = createServerFn({ method: "GET" }).handler(async (): Promise<AccountPage> => loadAccountPage());

/** Links the signed-in person to a member record. Takes only the code. */
export const submitLinkCode = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => {
    if (typeof input !== "object" || input === null || typeof input.code !== "string") throw new Error("Invalid code");
    const code = input.code.trim();
    if (!code || code.length > 40) throw new Error("Invalid code");
    return { code };
  })
  .handler(async ({ data }): Promise<LinkResult> => linkMember(data.code));

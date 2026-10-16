import { createServerFn } from "@tanstack/react-start";
import { loadSitePage, type SitePage } from "../server/site";

/**
 * Public data for the gym named by the request host. It takes no input, so
 * the browser cannot ask for another gym or another API path.
 */
export const getSitePage = createServerFn({ method: "GET" }).handler(async (): Promise<SitePage> => loadSitePage());

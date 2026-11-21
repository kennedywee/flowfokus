import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn, getGlobalStartContext } from "@tanstack/react-start";
import { routeTree } from "./routeTree.gen";

/** The nonce set by the request middleware. Server rendering only. */
const getNonce = createIsomorphicFn()
  .server(() => (getGlobalStartContext() as { nonce?: string } | undefined)?.nonce)
  .client(() => undefined);

export function getRouter() {
  const nonce = getNonce();
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // The window's main column scrolls, not the document.
    scrollToTopSelectors: ['[data-scroll-restoration-id="main"]'],
    defaultPreload: "intent",
    // Loaders call the API on every visit. Staff data must be fresh.
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
  interface StaticDataRouteOption {
    /**
     * The last top bar breadcrumb for a detail page, from its loader data,
     * for example the member's name. Return undefined while it is unknown.
     */
    crumb?: (loaderData: unknown) => string | undefined;
    /**
     * The sidebar section a page belongs to, when it is not the section in its
     * path. A session lives under /schedule but belongs to its program.
     */
    section?: "/$org/programs";
    /**
     * The breadcrumbs after the section, from the loader data. A crumb with a
     * program ID links to that program. The last crumb names the page.
     */
    trail?: (loaderData: unknown, timeZone: string) => { label: string; program?: string }[];
  }
}

/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import sansFont from "@fontsource-variable/geist/index.css?url";
import monoFont from "@fontsource-variable/geist-mono/index.css?url";
import { ToastProvider } from "../components/Toast";
import { Wordmark } from "../components/ui";
import { getTheme } from "../lib/theme.functions";
import type { Theme } from "../lib/validate";
import appCss from "../styles.css?url";
import { buttonVariants } from "@/components/ui/button";

/** The page colour of each theme, for the browser bar. Matches `--color-page` in tokens.css. */
const PAGE_COLOUR = { light: "#f6f6f4", dark: "#000000" } as const;

function themeMeta(theme: Theme) {
  if (theme !== "system") {
    return [
      { name: "color-scheme", content: theme },
      { name: "theme-color", content: PAGE_COLOUR[theme] },
    ];
  }
  // No theme-color: the router keeps one meta per name, so one tag cannot follow
  // the system both ways. Browsers then take the bar colour from the page.
  return [{ name: "color-scheme", content: "light dark" }];
}

export const Route = createRootRoute({
  // Read once. The theme menu reloads this route after a change.
  loader: () => getTheme(),
  staleTime: Infinity,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex, nofollow" },
      ...themeMeta(loaderData ?? "system"),
      { title: "Flowfokus staff portal" },
    ],
    links: [
      { rel: "stylesheet", href: sansFont },
      { rel: "stylesheet", href: monoFont },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const theme = Route.useLoaderData();
  return (
    // No class for `system`: tokens.css then follows the operating system.
    <html lang="en" className={theme === "system" ? undefined : theme}>
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="entry">
      <div className="entry__panel">
        <Wordmark />
        <div className="entry__text">
          <h1>Page not found</h1>
          <p>This address does not match a portal page. Check the address, or go to the staff portal.</p>
        </div>
        <div className="actions">
          <Link to="/" className={buttonVariants({ variant: "secondary" })}>
            Go to the staff portal
          </Link>
        </div>
      </div>
    </main>
  );
}

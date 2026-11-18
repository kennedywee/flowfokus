/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Link, Outlet, Scripts, createRootRoute, useRouterState, type ErrorComponentProps } from "@tanstack/react-router";
import sansFont from "@fontsource-variable/figtree/index.css?url";
// Emitted as files, not inlined, so browsers can cache them.
import faviconSvg from "../assets/flowfokus-mark.svg?url&no-inline";
import faviconPng from "../assets/favicon-32.png?url&no-inline";
import appleTouchIcon from "../assets/apple-touch-icon.png?url&no-inline";
import { ToastProvider } from "../components/Toast";
import { Blocked } from "../components/Blocked";
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
      // The logo mark. Browsers that cannot show an SVG icon take the PNG.
      { rel: "icon", type: "image/svg+xml", href: faviconSvg },
      { rel: "icon", type: "image/png", sizes: "32x32", href: faviconPng },
      { rel: "apple-touch-icon", href: appleTouchIcon },
      { rel: "stylesheet", href: sansFont },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: AppError,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  // Read from the router state, so the error screen still renders when the root loader failed.
  const theme = useRouterState({ select: (state) => state.matches[0]?.loaderData as Theme | undefined }) ?? "system";
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

/** Paper "Sign in — Page not found". */
function NotFound() {
  return (
    <Blocked title="Page not found" message="This address does not match a portal page. Check the address, or go to the staff portal.">
      <Link to="/" className={`${buttonVariants()} entry__action`}>
        Go to the staff portal
      </Link>
    </Blocked>
  );
}

/**
 * Paper "Sign in — Something went wrong": an error no screen handled. It
 * makes no promise about unsaved input, because an error can lose it.
 */
function AppError({ error }: ErrorComponentProps) {
  if (import.meta.env.DEV) console.error(error);
  return (
    <RootDocument>
      <Blocked title="Something went wrong" message="The page could not open. Reload to try again.">
        <button type="button" className={`${buttonVariants()} entry__action`} onClick={() => window.location.reload()}>
          Reload
        </button>
      </Blocked>
    </RootDocument>
  );
}

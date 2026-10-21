/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import sansFont from "@fontsource-variable/geist/index.css?url";
import monoFont from "@fontsource-variable/geist-mono/index.css?url";
import { ToastProvider } from "../components/Toast";
import { Wordmark } from "../components/ui";
import appCss from "../styles.css?url";
import { buttonVariants } from "@/components/ui/button";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#000000" },
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
  return (
    <html lang="en" className="dark">
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

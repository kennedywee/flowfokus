/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import legendFont from "@fontsource/barlow-semi-condensed/600.css?url";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#eef0f2" },
      { title: "Flowfokus staff portal" },
    ],
    links: [
      { rel: "stylesheet", href: legendFont },
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="entry">
      <div className="entry__panel">
        <h1>Page not found</h1>
        <p>This address does not match a portal page.</p>
        <p>
          <Link to="/">Go to the organization list</Link>
        </p>
      </div>
    </main>
  );
}

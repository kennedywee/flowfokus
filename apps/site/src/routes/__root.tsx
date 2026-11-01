/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { LogIn, UserRound } from "lucide-react";
import legendFont from "@fontsource/barlow-semi-condensed/600.css?url";
import { getSession, getSitePage } from "../lib/site.functions";
import type { SitePage } from "../server/site";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: async () => {
    const [page, session] = await Promise.all([getSitePage(), getSession()]);
    return { page, session };
  },
  head: ({ loaderData: data }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#eef0f2" },
      { title: data?.page.kind === "gym" ? data.page.organization.name : "Flowfokus gym site" },
      ...(data?.page.kind === "gym" ? [] : [{ name: "robots", content: "noindex" }]),
    ],
    links: [
      // Gym sites have no icon yet. An empty one stops the browser asking for /favicon.ico.
      { rel: "icon", href: "data:," },
      { rel: "stylesheet", href: legendFont },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: PageNotFound,
});

function RootComponent() {
  const { page, session } = Route.useLoaderData();
  return (
    <RootDocument>
      {page.kind === "gym" ? (
        <GymFrame name={page.organization.name} signedIn={session.person !== null}>
          <Outlet />
        </GymFrame>
      ) : (
        <HostMessage page={page} />
      )}
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

function GymFrame({ name, signedIn, children }: { name: string; signedIn: boolean; children: ReactNode }) {
  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="wrap">
          <Link to="/" className="gym-mark">
            {name}
          </Link>
          <nav className="topnav" aria-label="Site">
            <Link to="/" hash="offers">
              Memberships
            </Link>
            <Link to="/" hash="locations">
              Locations
            </Link>
            {signedIn ? (
              <Link to="/account">
                <UserRound aria-hidden="true" />
                Your account
              </Link>
            ) : (
              <Link to="/sign-in">
                <LogIn aria-hidden="true" />
                Member sign-in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer">
        <div className="wrap">Memberships and check-in run on Flowfokus.</div>
      </footer>
    </div>
  );
}

/** Pages for hosts that do not name a published gym. No gym data is shown. */
function HostMessage({ page }: { page: Exclude<SitePage, { kind: "gym" }> }) {
  if (page.kind === "setup") {
    const port = page.port ? `:${page.port}` : "";
    const example = `http://chainsaw.localhost${port}/`;
    return (
      <Message title="Open a gym site by its address">
        <p>
          Each gym has its own address. In development, put the gym's slug in front of{" "}
          <span className="code-line">localhost</span>.
        </p>
        <p>
          For the seeded gym, open <a href={example}>{example}</a>.
        </p>
        <p>Browsers send every *.localhost name to this computer, so no hosts file change is needed.</p>
      </Message>
    );
  }
  if (page.kind === "rejected") {
    return (
      <Message title="This address is not a gym site">
        <p>
          {page.reason === "reserved"
            ? "This name is reserved by Flowfokus and cannot be a gym."
            : "Gym sites use an address like chainsaw.flowfokus.com. Check the address and try again."}
        </p>
      </Message>
    );
  }
  if (page.kind === "not_found") {
    return (
      <Message title="No gym at this address">
        <p>There is no published gym with this name. Check the spelling, or ask the gym for its site address.</p>
      </Message>
    );
  }
  return (
    <Message title="Gym details cannot load right now">
      <p>The membership service did not answer. Try again in a few minutes.</p>
    </Message>
  );
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="message" id="main">
      <div className="wrap">
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}

function PageNotFound() {
  return (
    <section className="message">
      <div className="wrap">
        <h1>Page not found</h1>
        <p>
          This page does not exist. <Link to="/">Go to the home page</Link>.
        </p>
      </div>
    </section>
  );
}

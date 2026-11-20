import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState, rootRouteId, useLoaderData } from "@tanstack/react-router";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { useToast } from "@/components/Toast";
import { setTheme } from "@/lib/theme.functions";
import { applyTheme } from "@/lib/theme";
import { isTheme, type Theme } from "@/lib/validate";
import { loadExample } from "./examples";
import { GALLERY, PAPER_PAGES, groupedEntries, type GalleryEntry, type GalleryExample } from "./registry";

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

/** The gallery frame: a side list of components and the page. */
export function GalleryLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="gallery">
      <header className="gallery__bar">
        <Link to="/components" className="gallery__brand">
          Flowfokus components
        </Link>
        <Badge variant="demo">Local only · sample data</Badge>
        <ThemeChoice />
      </header>
      <PhoneJump path={path} />
      <nav className="gallery__nav" aria-label="Components">
        {groupedEntries().map(({ group, entries }) => (
          <section key={group} className="gallery__nav-group">
            <h2>{group}</h2>
            <ul>
              {entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    to="/components/$name"
                    params={{ name: entry.slug }}
                    className="gallery__nav-link"
                    aria-current={path === `/components/${entry.slug}` ? "page" : undefined}
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <main className="gallery__main">{children}</main>
    </div>
  );
}

/** Phones: one select instead of the long side list. */
function PhoneJump({ path }: { path: string }) {
  const navigate = useNavigate();
  const current = path.startsWith("/components/") ? path.slice("/components/".length) : "";
  return (
    <div className="gallery__jump">
      <label htmlFor="gallery-jump" className="visually-hidden">
        Component
      </label>
      <NativeSelect
        id="gallery-jump"
        value={current}
        onChange={(event) => {
          const name = event.target.value;
          void (name ? navigate({ to: "/components/$name", params: { name } }) : navigate({ to: "/components" }));
        }}
      >
        <NativeSelectOption value="">All components</NativeSelectOption>
        {groupedEntries().map(({ group, entries }) => (
          <NativeSelectOptGroup key={group} label={group}>
            {entries.map((entry) => (
              <NativeSelectOption key={entry.slug} value={entry.slug}>
                {entry.name}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        ))}
      </NativeSelect>
    </div>
  );
}

/** Light, dark or system, saved with the portal's own theme setting. */
function ThemeChoice() {
  const router = useRouter();
  const toast = useToast();
  const saved = useLoaderData({ from: rootRouteId }) as Theme;
  const [pending, setPending] = useState<Theme | null>(null);
  const theme = pending ?? saved;

  async function choose(next: Theme) {
    if (next === theme) return;
    setPending(next);
    applyTheme(next);
    try {
      await setTheme({ data: { theme: next } });
      await router.invalidate({ filter: (match) => match.routeId === rootRouteId });
    } catch {
      applyTheme(saved);
      toast.show({ tone: "error", title: "Theme not changed", body: "The choice was not saved. Try again." });
    } finally {
      setPending(null);
    }
  }

  return (
    <ToggleGroup
      aria-label="Theme"
      className="gallery__theme"
      value={[theme]}
      onValueChange={(values) => {
        const next = values[0];
        if (isTheme(next)) void choose(next);
      }}
    >
      <ToggleGroupItem value="light">Light</ToggleGroupItem>
      <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
      <ToggleGroupItem value="system">System</ToggleGroupItem>
    </ToggleGroup>
  );
}

/** The start page: every component, grouped. */
export function GalleryIndex() {
  return (
    <article className="gallery-page">
      <header className="gallery-page__head">
        <h1>Components</h1>
        <p>
          {GALLERY.length} components and blocks built in the portal. Check here before you build a new one.
        </p>
      </header>
      {groupedEntries().map(({ group, entries }) => (
        <section key={group} className="gallery-page__section" aria-labelledby={`group-${group}`}>
          <h2 id={`group-${group}`}>{group}</h2>
          <ul className="gallery-index">
            {entries.map((entry) => (
              <li key={entry.slug}>
                <Link to="/components/$name" params={{ name: entry.slug }} className="gallery-index__item">
                  <span className="gallery-index__name">{entry.name}</span>
                  <span className="gallery-index__summary">{entry.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

/** One component: summary, examples with code, props and links. */
export function GalleryEntryPage({ entry }: { entry: GalleryEntry }) {
  const [first, ...rest] = entry.examples;
  return (
    <article className="gallery-page">
      <header className="gallery-page__head">
        <p className="gallery-page__group">{entry.group}</p>
        <h1>{entry.name}</h1>
        <p>{entry.summary}</p>
      </header>
      {first ? <ExampleBlock example={first} /> : null}
      {rest.length ? (
        <section className="gallery-page__section" aria-labelledby="examples">
          <h2 id="examples">Examples</h2>
          {rest.map((example) => (
            <ExampleBlock key={example.file} example={example} titled />
          ))}
        </section>
      ) : null}
      {entry.props?.length ? (
        <section className="gallery-page__section" aria-labelledby="props">
          <h2 id="props">Props</h2>
          <table className="gallery-props">
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entry.props.map((prop) => (
                <tr key={prop.name}>
                  <th scope="row">
                    <code>{prop.name}</code>
                  </th>
                  <td>
                    <code>{prop.type}</code>
                  </td>
                  <td>{prop.default ? <code>{prop.default}</code> : "—"}</td>
                  <td>{prop.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <section className="gallery-page__section" aria-labelledby="links">
        <h2 id="links">Links</h2>
        <ul className="gallery-links">
          {entry.paper ? (
            <li>
              <a href={PAPER_PAGES[entry.paper.page]} target="_blank" rel="noreferrer">
                Paper: {entry.paper.page} › {entry.paper.board}
                <ExternalLink className="gallery-links__icon" {...icon} />
              </a>
            </li>
          ) : null}
          <li>
            Rules: <code>apps/portal/DESIGN.md</code>
          </li>
          {entry.source.map((file) => (
            <li key={file}>
              Source: <code>apps/portal/src/{file}</code>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

/** A live example with Preview and Code views. */
function ExampleBlock({ example, titled = false }: { example: GalleryExample; titled?: boolean }) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const loaded = loadExample(example.file);
  if (!loaded) return null;
  const { Component, code } = loaded;
  const id = `example-${example.file}`;
  return (
    <section className="gallery-example" aria-labelledby={id}>
      <div className="gallery-example__head">
        <h3 id={id} className={titled ? undefined : "visually-hidden"}>
          {example.title}
        </h3>
        <ToggleGroup
          aria-label={`${example.title}: view`}
          value={[view]}
          onValueChange={(values) => {
            const next = values[0];
            if (next === "preview" || next === "code") setView(next);
          }}
        >
          <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
          <ToggleGroupItem value="code">Code</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {example.note ? <p className="gallery-example__note">{example.note}</p> : null}
      {view === "preview" ? (
        <div className="gallery-example__preview">
          <Component />
        </div>
      ) : (
        <CodeBlock code={code} />
      )}
    </section>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.show({ tone: "error", title: "Code not copied", body: "Select the code and copy it." });
    }
  }
  return (
    <div className="gallery-code">
      <Button size="icon-compact" variant="ghost" className="gallery-code__copy" aria-label="Copy code" onClick={() => void copy()}>
        {copied ? <Check {...icon} /> : <Copy {...icon} />}
      </Button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

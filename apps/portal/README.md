# Staff portal

The staff portal for Flowfokus. TanStack Start (React) on Cloudflare Workers. It is the backend for frontend (BFF): the browser talks only to this app, and this app calls the Rails API from server code.

## Run locally

Start the WorkOS emulator and Rails first (`docker compose up -d workos server`, ports 4100 and 4000). Then:

```sh
cp apps/portal/.dev.vars.example apps/portal/.dev.vars   # once
bun run --cwd apps/portal dev                            # http://localhost:4001
```

Open `http://localhost:4001` and sign in. The local WorkOS emulator holds fake staff users; see `docs/local-auth.md`. With one organization, the portal opens it. With more, it shows a list, and the top bar switches between them. Pages live under `/<organization slug>/…`, for example `/chainsaw/members`.

`scripts/dev` from the repository root starts Rails, the portal, and the gym site together. In `vite dev`, the variables below are also read from the shell.

## Configuration

Worker variables and secrets. Local values go in `.dev.vars`, which is never committed.

| Name | Where | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | Variable | Rails base URL. Development defaults to `http://127.0.0.1:4000`. Production has no default; without it, every call fails closed. |
| `WORKER_SECRET` | Secret | Optional. Sent as `Flowfokus-Worker-Secret` with `Flowfokus-Client-IP`. |
| `FLOWFOKUS_DEMO_MODE` | Local only | `true` turns on the local demo actor. |
| `FLOWFOKUS_DEMO_TOKEN` | Local only | The demo Bearer value. At least 16 characters. Must match Rails. |
| `WORKOS_CLIENT_ID` | Variable | WorkOS client ID. |
| `WORKOS_API_KEY` | Secret | WorkOS API key. Production needs it. |
| `WORKOS_REDIRECT_URI` | Variable | The `/callback` address. Production needs HTTPS. |
| `WORKOS_COOKIE_PASSWORD` | Secret | Encrypts the session cookie. At least 32 characters. |
| `WORKOS_VERIFIED` | Variable | Production only. `true` after a person checked the real WorkOS environment end to end. Until then, staff sign-in stays off. |
| `WORKOS_API_HOSTNAME`, `WORKOS_API_PORT`, `WORKOS_API_HTTPS` | Local only | Point the SDK at the emulator. Production builds ignore them and use `api.workos.com`. |
| `WORKOS_BROWSER_URL` | Local only | The emulator address as the browser opens it, when the Worker reaches it at another address (Docker: `http://workos:4100` inside, `http://localhost:4100` outside). |

## Staff sign-in

The portal uses the official WorkOS SDK, `@workos/authkit-tanstack-react-start`, on the server only.

- `/sign-in` sets a PKCE verifier cookie and sends the browser to AuthKit. `?returnTo=` keeps same-origin paths only.
- `/callback` checks the `state` against the verifier cookie, exchanges the code, and sets the session cookie. A failure returns to the start page with a notice and no session.
- The session lives in one encrypted, `httpOnly`, `SameSite=Lax`, host-only cookie: `__Host-hf_session` over HTTPS, `hf_session` over local HTTP. The request middleware refreshes an expired access token and saves the new cookie.
- The Worker reads the access token from the session and sends it to Rails as a Bearer token. Server functions return display data only (name, email, organizations), never a token. The portal has no AuthKit client provider and no client token store.
- The organization in the URL picks the organization. When the session holds another one, the Worker refreshes the session for that organization. WorkOS issues the token only for an active membership, and Rails checks that the token matches the slug.
- `/sign-out` accepts a same-origin POST only. It clears the session cookie and sends the browser to WorkOS to end the WorkOS session.
- The SDK package also defines server functions that return tokens. The portal never imports them in browser code, so production builds do not register them. The request guard also refuses any server function outside `src/lib/*.functions.ts`, which covers the development server.

## Local demo access

Demo access is opt-in and local only. It skips sign-in. All of these must hold:

1. A development build (`vite dev`). Production builds do not contain the demo code path at all.
2. `FLOWFOKUS_DEMO_MODE=true` and a demo token of at least 16 characters.

The Worker attaches the demo Bearer token on the server. The browser never sees it. Rails maps it to the fixed seeded actor (Demo Owner, Chainsaw). The portal labels every demo page **Local demo**.

Without WorkOS settings or demo access, the portal shows sign-in as unavailable and turns off every staff page and action.

## UI components

The portal uses [shadcn/ui](https://ui.shadcn.com) components on [Base UI](https://base-ui.com) primitives, with Tailwind CSS v4. `components.json` holds the shadcn settings. Add a component with:

```sh
cd apps/portal && bunx shadcn@latest add <component>
```

Answer **no** when the CLI asks to overwrite an existing file: the files in `src/components/ui/` are edited for the portal.

- **Behaviour from Base UI.** Focus, keyboard, ARIA, portals, and positioning come from the shadcn components.
- **Look from our CSS.** Each component renders the portal classes in `src/styles/` (for example `.button`, `.plate`, `.dialog`, `.menu`). After adding a component, replace its Tailwind look with those classes or new ones built on the tokens in `tokens.css`.
- **Layers.** `src/styles.css` loads Tailwind first, then our files into the `base` and `components` layers. Tailwind utilities on an element still win over our classes. Do not add rules outside a layer.
- **Theme.** The shadcn variables (`--background`, `--primary`, and the others) point at our tokens. Each colour token holds a light and a dark value in `light-dark()`. Staff choose System, Light, or Dark in the account menu. The choice lives in an httpOnly cookie (`lib/theme.functions.ts`), so the server sets the `light` or `dark` class on `<html>` and the page never flashes. System sets no class and follows the operating system through CSS. Add new colours to `tokens.css` with both values.
- **Helpers.** `src/components/ui.tsx` builds the portal patterns (status pills, notices, cards with a heading, fields with hints and errors) from the shadcn parts. Use them in pages.
- **Pickers.** Use `NativeSelect` for a short, plain list. Use `Select` only when options need icons or details. Use `Combobox` (`src/components/Combobox.tsx`) to search a long list. Use `DatePicker` (`src/components/DatePicker.tsx`) for a date. It takes and returns `"YYYY-MM-DD"`.
- **Page layout.** Every page is a `.page` with a `PageHead`, so headers and content line up across pages:
  - The title matches the sidebar label and the breadcrumb. The description is one short line. The header keeps the same height without one.
  - Header buttons use the default size. Use the primary variant for the main task and secondary for the rest.
  - Cards (`Plate`) have a title and an optional description, with no icon tile. Numbered steps, as on New sale, are the one exception.
  - A list card has no title: the page title already names it. Its toolbar (filters, count, search) opens the card. Filters use the toggle-group look.
- **Outside Base UI.** `Calendar` uses react-day-picker. `Command` uses cmdk, which brings a few Radix packages with it.

## Request boundary

- The browser calls only fixed server functions in `src/lib/staff.functions.ts`. Each one calls one `/staff/*` endpoint through `@flowfokus/api`. There is no general proxy. The browser cannot choose an upstream path, a token, or a `Flowfokus-*` header.
- Reads are GET. Writes are POST with `application/json`; other methods and content types get `405` or `415`. `createCsrfMiddleware()` rejects cross-site calls.
- Sales, payments, and check-ins send an `Idempotency-Key`. The form keeps the key for retries and renews it after success or after an edit.
- Every response carries `Cache-Control: private, no-store`, a Content Security Policy with a per-response script nonce, and frame, referrer, and content-type headers.

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server on port 4001 |
| `bun run build` | Worker bundle in `dist/` |
| `bun run preview` | Runs the built Worker locally |
| `bun run typecheck` | TypeScript check |
| `bun test` | Boundary and input tests |
| `bun run cf-typegen` | Generates binding types with Wrangler |

## Limits in Sprint 1

- Staff sign-in runs against the local WorkOS emulator only. Production stays off until a person verifies a real WorkOS environment and sets `WORKOS_VERIFIED=true`.
- Member sign-in is not built.
- Member choice uses a plain list, which suits small seed data. A search picker is needed for large gyms.
- Payments are recorded by hand (cash or bank transfer). Nothing is charged.

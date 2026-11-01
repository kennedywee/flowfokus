# Gym site

The public site and member area for each gym. One build serves every gym; the request host chooses which. TanStack Start (React) on Cloudflare Workers. The browser talks only to this app. This app calls `/public/*` on Rails with no credential, and `/member/*` with the signed-in member's Bearer token. It never calls `/staff/*`.

## Run locally

Start Rails first (`apps/server`, port 4000). Then:

```sh
cp apps/site/.dev.vars.example apps/site/.dev.vars   # once
bun run --cwd apps/site dev                          # port 4002
```

Open `http://chainsaw.localhost:4002`. Browsers send every `*.localhost` name to this computer. Plain `http://localhost:4002` shows how to open a gym; it never picks one for you.

## How the host chooses the gym

`src/server/host.ts` reads the request host:

| Host | Result |
| --- | --- |
| `<slug>.flowfokus.com` | That gym. Rails returns `404` if it does not exist or is not published. |
| `<slug>.localhost:4002` | That gym, in development builds only. |
| `localhost:4002` | Setup instructions, in development builds only. |
| Reserved slug (`portal`, `api`, `www`, `admin`, `auth`, `login`, …) | `404` |
| Nested, malformed, IP, or other domain | `404` |

`SITE_BASE_DOMAINS` (comma-separated, default `flowfokus.com`) sets the production base domains. To try a production build on your machine with `bun run preview`, set `SITE_BASE_DOMAINS=flowfokus.com,localhost` in `.dev.vars`.

## Configuration

| Name | Where | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | Variable | Rails base URL. Development defaults to `http://127.0.0.1:4000`. Production has no default; without it, the site shows a "cannot load" page with status 503. |
| `SITE_BASE_DOMAINS` | Variable | Gym site base domains. Set in `wrangler.jsonc`. |
| `WORKER_SECRET` | Secret | Sent as `Flowfokus-Worker-Secret` with `Flowfokus-Client-IP`. |
| `WORKOS_CLIENT_ID` | Variable | Turns member sign-in on, with the settings below. |
| `WORKOS_API_KEY` | Secret | WorkOS API key. |
| `WORKOS_REDIRECT_URI` | Variable | Any valid gym callback. The SDK needs one; each request passes its own host's `/callback`. HTTPS in production. |
| `WORKOS_COOKIE_PASSWORD` | Secret | At least 32 characters. Use a different value from the portal. |
| `WORKOS_VERIFIED` | Variable | Production only. `true` after a person verified WorkOS end to end. Without it, sign-in stays off. |
| `WORKOS_API_HOSTNAME`, `WORKOS_API_PORT`, `WORKOS_API_HTTPS`, `WORKOS_BROWSER_URL` | Variable | Development only: the local emulator. Production builds ignore them. |

Without the WorkOS settings, `/sign-in` says that sign-in is turned off and the account page asks the member to use the front desk.

## Request boundary

- Server functions live in `src/lib/site.functions.ts` and take no gym or path input. The gym slug comes from the host. `getSitePage`, `getSession`, and `getAccountPage` read; `submitLinkCode` sends only the code.
- Pages accept GET and HEAD. `/sign-out` accepts POST only. Server function writes need POST with `application/json`. Server functions and the sign-out form must be same-origin (`createCsrfMiddleware`); page loads are not checked. In development, only this app's `*.functions.ts` exports can be called, so the SDK's own server functions stay unreachable.
- The access token stays in the encrypted session cookie and in server code. It is never sent to the browser.
- Responses carry `Cache-Control: private, no-store`, a Content Security Policy with a per-response script nonce, and frame, referrer, and content-type headers.

## Member sign-in

- `/sign-in` explains the account and starts sign-in at `/auth/start`. That route checks the gym host, sets the PKCE cookie, and sends the browser to AuthKit with this host's `/callback`.
- `/callback` completes sign-in on the same host. The cookie is host-only, so each gym site has its own session.
- `/account` shows the member's membership, rights, visits, and purchases from `GET /member/account`. A signed-in person without a linked member enters the link code from the front desk.
- `/sign-out` (POST) clears the cookie and ends the WorkOS session, then returns to this gym's home page.

See [Local staff authentication](../../docs/local-auth.md#member-sign-in-on-the-gym-site) for the local walkthrough.

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server on port 4002 |
| `bun run build` | Worker bundle in `dist/` |
| `bun run preview` | Runs the built Worker locally |
| `bun run typecheck` | TypeScript check |
| `bun test` | Host, CSRF, header, and member access tests |

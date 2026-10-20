# Gym site

The public site for each gym. One build serves every gym; the request host chooses which. TanStack Start (React) on Cloudflare Workers. The browser talks only to this app. This app calls `/public/*` on Rails from server code, with no credential.

## Run locally

Start Rails first (`apps/server`, port 3000). Then:

```sh
cp apps/site/.dev.vars.example apps/site/.dev.vars   # once
bun run --cwd apps/site dev                          # port 3002
```

Open `http://chainsaw.localhost:3002`. Browsers send every `*.localhost` name to this computer. Plain `http://localhost:3002` shows how to open a gym; it never picks one for you.

## How the host chooses the gym

`src/server/host.ts` reads the request host:

| Host | Result |
| --- | --- |
| `<slug>.flowfokus.com` | That gym. Rails returns `404` if it does not exist or is not published. |
| `<slug>.localhost:3002` | That gym, in development builds only. |
| `localhost:3002` | Setup instructions, in development builds only. |
| Reserved slug (`portal`, `api`, `www`, `admin`, `auth`, `login`, …) | `404` |
| Nested, malformed, IP, or other domain | `404` |

`SITE_BASE_DOMAINS` (comma-separated, default `flowfokus.com`) sets the production base domains. To try a production build on your machine with `bun run preview`, set `SITE_BASE_DOMAINS=flowfokus.com,localhost` in `.dev.vars`.

## Configuration

| Name | Where | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | Variable | Rails base URL. Development defaults to `http://127.0.0.1:3000`. Production has no default; without it, the site shows a "cannot load" page with status 503. |
| `SITE_BASE_DOMAINS` | Variable | Gym site base domains. Set in `wrangler.jsonc`. |
| `WORKER_SECRET` | Secret | Optional. Sent as `Flowfokus-Worker-Secret` with `Flowfokus-Client-IP`. |

The site needs no sign-in credential in Sprint 1.

## Request boundary

- One server function, `getSitePage`, takes no input. The gym slug comes from the host, so the browser cannot ask for another gym or another API path. Only `/public/organization` and `/public/products` are called.
- The site accepts GET and HEAD only. Every other method gets `405`. Server function calls must be same-origin (`createCsrfMiddleware`); page loads are not checked.
- Responses carry `Cache-Control: no-store`, a Content Security Policy with a per-response script nonce, and frame, referrer, and content-type headers.

## Member sign-in

The signed-in member area ships in a later sprint. `/sign-in` explains that sign-in is not available, and its button is turned off. The site never fakes a signed-in state.

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server on port 3002 |
| `bun run build` | Worker bundle in `dist/` |
| `bun run preview` | Runs the built Worker locally |
| `bun run typecheck` | TypeScript check |
| `bun test` | Host, CSRF, and header tests |

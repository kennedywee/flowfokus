# Staff portal

The staff portal for Flowfokus. TanStack Start (React) on Cloudflare Workers. It is the backend for frontend (BFF): the browser talks only to this app, and this app calls the Rails API from server code.

## Run locally

Start Rails first (`apps/server`, port 4000). Then:

```sh
cp apps/portal/.dev.vars.example apps/portal/.dev.vars   # once
bun run --cwd apps/portal dev                            # http://localhost:4001
```

Open `http://localhost:4001`. It opens the demo organization, **Chainsaw Gym**. Pages live under `/<organization slug>/…`, for example `/chainsaw/members`.

`scripts/dev` from the repository root starts Rails, the portal, and the gym site together. In `vite dev`, the variables below are also read from the shell.

## Configuration

Worker variables and secrets. Local values go in `.dev.vars`, which is never committed.

| Name | Where | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | Variable | Rails base URL. Development defaults to `http://127.0.0.1:4000`. Production has no default; without it, every call fails closed. |
| `WORKER_SECRET` | Secret | Optional. Sent as `Flowfokus-Worker-Secret` with `Flowfokus-Client-IP`. |
| `FLOWFOKUS_DEMO_MODE` | Local only | `true` turns on the local demo actor. |
| `FLOWFOKUS_DEMO_TOKEN` | Local only | The demo Bearer value. At least 16 characters. Must match Rails. |
| `WORKOS_*` | Next sprint | WorkOS AuthKit is not integrated yet. With these set, the portal still reports sign-in as unavailable. |

## Local demo access

Demo access is opt-in and local only. All of these must hold:

1. A development build (`vite dev`). Production builds do not contain the demo code path at all.
2. `FLOWFOKUS_DEMO_MODE=true` and a demo token of at least 16 characters.
3. The request host is `localhost`, `*.localhost`, or a loopback address.

The Worker attaches the demo Bearer token on the server. The browser never sees it. Rails maps it to the fixed seeded actor (Demo Owner, Chainsaw). The portal labels every demo page **Local demo**.

Without demo access, the portal shows sign-in as unavailable and turns off every staff page and action.

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

- No real sign-in. WorkOS AuthKit ships next sprint.
- Member choice uses a plain list, which suits small seed data. A search picker is needed for large gyms.
- Payments are recorded by hand (cash or bank transfer). Nothing is charged.

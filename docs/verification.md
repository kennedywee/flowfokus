# Verification

## Local staff authentication — 22 October 2026

Local staff sign-in uses WorkOS Emulate 0.16.0 in Docker. Demo mode is off by
default. No live WorkOS account was used. Application changes are committed on
`master`; nothing was pushed or deployed.

### Automated and HTTP checks

- All 147 Rails examples pass in Docker, including real response contracts,
  JWT signature/issuer/expiry checks, permissions, organization isolation, key
  rotation, and the existing membership workflow.
- All 85 portal tests, 42 gym-site tests, and 3 tooling tests pass. Generated API
  types match OpenAPI. Shared API and both apps pass TypeScript checks.
- Both apps build their Cloudflare Worker bundles. Artifact checks find no local
  environment files after cleanup. Each app still has its own image.
- `bun run smoke:auth` passes against the running emulator and Rails: signed
  tokens, organization lists, role restrictions, cross-organization denial,
  organization switching, refresh rotation and replay convergence, revoked
  refresh rejection, and the full sale/payment/access/check-in workflow.
- `bun run smoke:session` passes against the running portal. A sealed cookie with
  a rejected access token and a valid refresh token exercises the SDK's refresh
  fallback. The portal saves the rotated token in an HttpOnly, host-only cookie,
  accepts that cookie on the next request, and requires sign-in after the refresh
  session is revoked. Responses use `private, no-store`; HTML contains no JWT.
- The production Rails image builds. `scripts/check-production-image` confirms
  production refuses demo mode and fails closed without authentication. A separate
  check confirms production rejects emulator issuer/JWKS URLs even when
  `WORKOS_VERIFIED=true` is supplied.
- Compose configuration and shell syntax checks pass. Supporting services run in
  Docker. Database preparation remains explicit.

### Browser checks

The T3 collaborative browser completed the following through the Docker portal:

1. Sign in as the seeded owner through the emulator's email/password pages.
2. Create a member, record an RM 80 sale, and record a cash payment.
3. Confirm delivery of the membership and open the member's access record.
4. Check in successfully. The counted entitlement changes from 8 visits left to
   7 visits left, with one usage recorded.
5. Sign out through the account menu and return to the signed-out page.
6. Sign in as the multi-organization manager and select Ironworks in WorkOS.
   The portal opens `/ironworks` directly, without a second organization chooser.
7. Switch to Chainsaw through the top bar. Returning to `/` opens Chainsaw directly.
8. Sign out and sign in from `/sign-in?returnTo=/ironworks/members`.
   Selecting Ironworks opens the Members page directly. Sign out again.

The browser made no direct requests to Rails port 4000. No JWT appeared in the
page HTML or browser storage. The safe session server function returned the user
without tokens. Direct and encoded requests for SDK token server functions
returned 404. The production server-function manifest contains only portal
functions, and client assets contain no WorkOS SDK code.

HTTP checks reject GET sign-out with 405, a foreign-origin sign-out POST with
403, and a tampered callback with a redirect to the sign-in failure state.
The signed-out page and organization chooser fit a 390-pixel viewport without
horizontal overflow.

### Remaining verification

Real WorkOS staging, live webhook sync and reconciliation, member sign-in and
linking, trusted Worker/client-IP middleware, cloud deployment, and GitHub-hosted
CI remain unverified or unimplemented. Production staff access remains gated by
`WORKOS_VERIFIED` in both the portal and Rails. The emulator tests do not replace
real-service verification.

The Vite CSS plugin still reports its existing source-map warning. Builds pass.

See [Local staff authentication](local-auth.md) for setup and fake accounts.

## Sprint 1 verification — 16 October 2026

Verified locally on 16 October 2026. Supporting services run in Docker. All application changes are committed directly to `master`.

### Checks completed

- `docker compose build server portal site`: three independent app images build.
- `docker compose run --rm server bin/rails db:prepare`: explicit database preparation completes.
- `docker compose up -d --build --wait`: local PostgreSQL, Rails, portal, and gym site start. The stack contains these four services. Only PostgreSQL has a local health check; app endpoints are verified separately.
- `bash scripts/check-docker`: Rails specs, frontend tests, generated API types, TypeScript checks, and both Worker builds pass inside containers.
- `bun run contract:check`: generated types match the committed OpenAPI contract.
- `bun run smoke`: public organization, member creation, denied access, sale retry, partial payments, payment retry, fulfillment retry, granted check-in, and single consumption pass against the running API.
- `docker build -t flowfokus-server:candidate apps/server`: the production API image builds.
- The `worker-build` targets in `apps/portal/Dockerfile` and `apps/site/Dockerfile` build independently and contain no local environment files.
- `bash scripts/check-production-image flowfokus-server:candidate`: production rejects demo mode, boots without a database connection, and refuses protected requests when authentication is unavailable.
- Workflow syntax and shell checks pass. GitHub-hosted CI and release workflows have not been run.

The test run includes 97 Rails examples, 55 portal tests, 42 gym-site tests, and 3 tooling tests. Rails tests cover real response contracts, tenant isolation, permissions, immutable purchase history, partial payments, renewal ordering, concurrent writes, and entitlement usage.

### Database schema

The project uses `apps/server/db/schema.rb`. A fresh test database loads from this file. Tests confirm that composite foreign keys, check constraints, membership-period exclusion constraints, and all three immutability triggers survive the load. Fx manages trigger and function definitions. There is no `structure.sql`.

### Development reload

Local Compose mounts Rails source, both web apps' `src` directories, and the shared API client's source. A temporary controller edit appeared on the next Rails request. Temporary CSS edits appeared automatically in both browser tabs through Vite hot updates. All probe edits were reverted. The container IDs, images, and start times stayed unchanged during these checks.

Normal code edits need no image rebuild. Dependencies, Dockerfiles, and web configuration outside `src` still require a rebuild.

### Browser workflow

A real Chromium browser completed this sequence through the Docker portal:

1. Create a member.
2. Select an offer and record a sale.
3. Record manual payment.
4. Deliver the membership.
5. Open the member record and check in successfully.

The browser also checked the public gym offers, the unavailable member sign-in state, and a `404` for an unknown gym. Desktop and 390-pixel mobile layouts were inspected. Neither app had horizontal overflow. The browser made no direct calls to the Rails port, and the demo token was absent from rendered HTML.

The T3 preview snapshot timed out twice. Its alternate browser connector had no browser available. The checks used the installed local Playwright and Chromium instead.

### Release boundary

Nothing was pushed, tagged, published, or deployed. Manual payment records do not move money. Production staff and member authentication remains unavailable until WorkOS integration is completed. The API does not yet implement trusted Worker/client-IP middleware.

The Vite CSS plugin reports a source-map warning. App builds pass; CSS debugging maps can be inaccurate.

An additional Claude API review could not complete because the provider rate limit was reached. The coordinating agent reviewed the authentication boundary, tenant queries, payment and fulfillment transactions, check-in locking, and schema protections. The completed tests and browser checks are the release evidence; no successful independent final review is claimed.

See [Deployment candidate](deployment.md) for runtime configuration, migration steps, and credentials required next sprint.

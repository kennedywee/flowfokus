# Verification

## First-release workflows — 1 November 2026

Local Docker stack with WorkOS Emulate. Nothing was pushed, tagged, or deployed.

### Checks completed

- `bash scripts/check-docker` passes: 315 Rails examples, OpenAPI coverage of
  every success response, generated types, 107 portal tests, 56 site tests,
  type checks, both Worker builds, and Worker artifacts.
- `bun run contract:check` and `bun run test:tooling` pass.
- `bun run smoke:workflows` passes twice in a row against Rails and the
  emulator with real emulator tokens. It covers the catalog, early delivery,
  payments, refunds, check-in denial and override, renewal at an archived
  price, revocation, void, locations, settings, the team through WorkOS,
  member linking, the member account, staff and member isolation, and the report.
- `smoke:auth`, `smoke:identity`, and `smoke:session` still pass.
- Browser checks, signed in through the emulator:
  - Owner: add an offer with two benefits, add a price, take it off sale,
    archive it, and edit the offer. The gym site showed the offer, then hid it.
  - Renew a member, pay, and deliver. The new period starts where the last one ends.
  - Deliver early with a required reason; refund within the payment; revoke
    access; void an unpaid sale.
  - Settings: add a location (duplicate names refused), change the time zone,
    and unpublish the gym site (404), then publish it again.
  - Team: invite, revoke, and change a role through WorkOS. The webhook that
    followed changed nothing more.
  - Let a denied member in with a reason. The history keeps both attempts.
  - Reports show real weekly figures.
  - Receptionist: no catalog actions, and the Team section names the missing permission.
- Member, on `chainsaw.localhost:4002`: sign in as `member@example.com`, refuse a
  wrong code, link with the desk code, see the membership, visits left, visit,
  and payment, then sign out.
- HTTP checks on the gym site: GET `/sign-out` gives 405, a cross-site sign-out
  POST gives 403, PUT gives 405, unknown server functions give 404, and sign-in
  on a reserved or unknown host gives 404. The site's browser bundle contains
  no token code.
- The jobs container processed a planted stuck WorkOS event within one pass.

### Not verified

- Layouts at 390 pixels for the new screens. The preview tab used for these
  checks could not change its width.
- Live WorkOS, Cloudflare Workers, the VPS, and GitHub-hosted CI. They still need
  credentials.

### Implementation limits

Where `decisions.md` is still open, the build takes the narrowest rule and says
so in the topic documents: partial refunds per payment that never change
access, revocation of one delivery, voids only before delivery with no money
kept, a staff-issued one-time link code, and a one-visit check-in override.
Manual grants of new rights, organization creation, and the sample Inbox,
Agents, Notifications, and Integrations screens are not built.

## Local WorkOS identity sync — 22 October 2026

Opus implemented the Rails sync. Coordinator review and follow-up fixes covered
concurrent creation, token observation, deletions, reconciliation, and API
compatibility. The local Docker stack is the verified webhook setup. Nothing
was pushed or deployed.

### Checks completed

- All 231 Rails examples pass in Docker. Coverage includes actual webhook
  response contracts, raw-body signatures, body size limits, duplicates,
  reordered events, equal-version conflicts, retained history, tenant links,
  missed user deletions, partial API failures, and concurrent identity writes.
- Real parallel transactions cover both unique-index and validation races on
  first user creation. A separate regression proves a deletion arriving before
  the first insert leaves the user deleted. Removing the fixes reproduces the
  failures. Old token observation cannot restore removed staff memberships.
- A fresh schema load preserves the event ledger constraints and immutable
  routing fields. The trigger update has a reversible migration. Rails keeps
  `db/schema.rb`.
- RuboCop passes across 103 files. Brakeman reports no warnings or errors.
- All 104 portal tests, 42 site tests, and 3 tooling tests pass. Generated types
  match OpenAPI. API, portal, and site type checks pass. The contract comparison
  against `2005249` reports no breaking changes. Webhook error codes have their
  own schema, so older endpoint response enums stay unchanged.
- Both Cloudflare Worker bundles build. Artifact checks pass after local
  environment files are removed. The existing Vite CSS source-map warning
  remains.
- The production Rails image builds. The image check confirms it boots without
  a database, rejects demo mode, and refuses protected demo requests.
- `bun run smoke:identity` passes against the running emulator and Rails. It
  creates a staff identity without Rails seeds, applies name and role changes,
  rejects a bad signature, accepts duplicate delivery, and preserves removal
  despite an old token. After cleanup, the ledger has 14 processed events and
  no pending or failed events.
- `bun run smoke:auth` and `bun run smoke:session` pass. The existing membership
  sale, payment, access delivery, check-in, organization switching, refresh, and
  revoked-session checks remain successful.
- A separate outage check disabled the local webhook, created a user and
  membership, and imported them through `workos:reconcile`. A repeated import
  preserved one membership. Deleting the remote user while delivery stayed
  disabled, then reconciling, marked the local user deleted and rejected their
  old token with 401. The webhook was enabled again afterward.
- Rails liveness and readiness, the portal, and the gym site at
  `chainsaw.localhost:4002` answer successfully. Compose configuration, shell
  syntax, and JavaScript syntax checks pass.

### Host processes and release limits

The host-mode script points the emulator at the Docker host gateway and allows
that development host in Rails. Rails answered on localhost during the host
probe, but the emulator's gateway request failed with
`The operation was aborted due to timeout`. Host-mode webhook delivery is not
verified on this machine. The Docker setup was restored. No host firewall
settings were changed. Host developers can use explicit reconciliation or
configure container-to-host access. See [WorkOS identity sync](workos-sync.md).

Real WorkOS, cloud deployment, and GitHub-hosted CI remain unverified. The
in-process job adapter can lose queued jobs on restart; the event ledger and
explicit retry command recover them. Automatic recovery scheduling remains
production follow-up work. Membership revocation takes effect when existing
tokens expire, plus five seconds of clock leeway. The production token lifetime
and required revocation delay remain open.

Deleted WorkOS gyms leave staff navigation but retain their Rails publication
setting. Closing a gym's public site needs a separate product policy. Staff
invitation screens, account profile forms, and member linking remain separate
work.

## Local staff authentication — 22 October 2026

Local staff sign-in uses WorkOS Emulate 0.16.0 in Docker. Demo mode is off by
default. No live WorkOS account was used. Application changes are committed on
`master`; nothing was pushed or deployed.

### Automated and HTTP checks

- All 147 Rails examples pass in Docker, including real response contracts,
  JWT signature/issuer/expiry checks, permissions, organization isolation, key
  rotation, and the existing membership workflow.
- All 104 portal tests, 42 gym-site tests, and 3 tooling tests pass. Generated API
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
9. Repeat the manager flow through `http://100.89.45.88:4001`. The login page
   opens on that host at port 4100. The callback opens Ironworks Members on
   port 4001. Switching to Chainsaw and signing out keep the Tailscale host.
   The user also confirmed sign-in works from macOS through Tailscale.
10. Verify owner sign-in, a Members deep link, and sign-out still work on localhost.

The local portal and emulator share an explicit development host list. HTTP
checks accept localhost and the configured Tailscale address, reject an unlisted
host, and confirm forwarded host headers cannot change the callback. SDK tests
check the callback, PKCE cookie, logout return URL, and host-only session cookie
names. Production keeps the configured callback origin, including after sign-out.

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
linking, cloud deployment, and GitHub-hosted
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

Nothing was pushed, tagged, published, or deployed. Manual payment records do not move money. Production staff and member authentication remains unavailable until WorkOS integration is completed.

The Vite CSS plugin reports a source-map warning. App builds pass; CSS debugging maps can be inaccurate.

An additional Claude API review could not complete because the provider rate limit was reached. The coordinating agent reviewed the authentication boundary, tenant queries, payment and fulfillment transactions, check-in locking, and schema protections. The completed tests and browser checks are the release evidence; no successful independent final review is claimed.

See [Deployment candidate](deployment.md) for runtime configuration, migration steps, and credentials required next sprint.

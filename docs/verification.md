# Sprint 1 verification

Verified locally on 16 October 2026. Supporting services run in Docker. All application changes are committed directly to `master`.

## Checks completed

- `docker compose build server portal site`: three independent app images build.
- `docker compose up -d --build --wait`: local PostgreSQL, Rails, portal, and gym site start. Database preparation is a separate local job.
- `bash scripts/check-docker`: Rails specs, frontend tests, generated API types, TypeScript checks, and both Worker builds pass inside containers.
- `bun run contract:check`: generated types match the committed OpenAPI contract.
- `bun run smoke`: public organization, member creation, denied access, sale retry, partial payments, payment retry, fulfillment retry, granted check-in, and single consumption pass against the running API.
- `docker build -t hydraflow-server:candidate apps/server`: the production API image builds.
- `bash scripts/check-production-image hydraflow-server:candidate`: production rejects demo mode, boots without a database connection, and refuses protected requests when authentication is unavailable.
- Workflow syntax and shell checks pass. GitHub-hosted CI and release workflows have not been run.

The test run includes 97 Rails examples, 55 portal tests, 42 gym-site tests, and 3 tooling tests. Rails tests cover real response contracts, tenant isolation, permissions, immutable purchase history, partial payments, renewal ordering, concurrent writes, and entitlement usage.

## Database schema

The project uses `apps/server/db/schema.rb`. A fresh test database loads from this file. Tests confirm that composite foreign keys, check constraints, membership-period exclusion constraints, and all three immutability triggers survive the load. Fx manages trigger and function definitions. There is no `structure.sql`.

## Browser workflow

A real Chromium browser completed this sequence through the Docker portal:

1. Create a member.
2. Select an offer and record a sale.
3. Record manual payment.
4. Deliver the membership.
5. Open the member record and check in successfully.

The browser also checked the public gym offers, the unavailable member sign-in state, and a `404` for an unknown gym. Desktop and 390-pixel mobile layouts were inspected. Neither app had horizontal overflow. The browser made no direct calls to the Rails port, and the demo token was absent from rendered HTML.

The T3 preview snapshot timed out twice. Its alternate browser connector had no browser available. The checks used the installed local Playwright and Chromium instead.

## Release boundary

Nothing was pushed, tagged, published, or deployed. Manual payment records do not move money. Production staff and member authentication remains unavailable until WorkOS integration is completed. The API does not yet implement trusted Worker/client-IP middleware.

The Vite CSS plugin reports a source-map warning. App builds pass; CSS debugging maps can be inaccurate.

An additional Claude API review could not complete because the provider rate limit was reached. The coordinating agent reviewed the authentication boundary, tenant queries, payment and fulfillment transactions, check-in locking, and schema protections. The completed tests and browser checks are the release evidence; no successful independent final review is claimed.

See [Deployment candidate](deployment.md) for runtime configuration, migration steps, and credentials required next sprint.

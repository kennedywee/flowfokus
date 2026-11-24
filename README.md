# Flowfokus

A membership platform for service businesses. The Rails API owns business rules. The staff portal and gym site use TanStack Start on Cloudflare Workers.

The agreed design is in [docs](docs/README.md). Work to do and open decisions are [GitHub issues](https://github.com/kennedywee/flowfokus/issues).

## Status

Flowfokus runs locally as a tested deployment candidate. It is not deployed.

- **Built and backed by Rails:** members, membership products and prices, sales, manual payments, fulfillment, renewal, refunds, programs, sessions, bookings, passes, tickets, locations, settings, feature flags, and the staff team. Members can sign in on the gym site, buy online through a local test payment provider, and book sessions.
- **Staff portal:** Calendar replaced Schedule, and Settings opens as a dialog over the current page. The portal follows the Paper file "Flowfokus Design". Home, Inbox, Agents, Check-ins, and Reports left the scope on 21 November 2026, and so did walk-in gym check-in. See [Frontend preview](docs/frontend-preview.md) for the pages and the design reference. The [Rails gaps](docs/paper-redesign/rails-gaps.md) list what the new screens show that Rails cannot supply yet.
- **Feature flags:** the gym site is the first flag, `gym_site`. See [Feature flags](docs/feature-flags.md).
- **Sample data only:** the component gallery at `/components`, in local development. No portal screen uses sample data.
- **Next:** the Rails work for the redesigned screens, the open `decision` issues, live WorkOS verification, and the first deployment.

## Project directory

- `apps/server`: Rails 8 API and OpenAPI contract.
- `apps/portal`: staff portal.
- `apps/site`: public gym site and signed-in member area.
- `packages/api`: generated API types and shared client.
- `scripts`: local setup and checks.
- `compose.yaml`: local services.

## Run with Docker

```sh
docker compose build
docker compose run --rm server bin/rails db:prepare
docker compose up
```

Open the staff portal at `http://localhost:4001` and the gym site at `http://chainsaw.localhost:4002`. The seed turns on `gym_site` for Chainsaw. The API uses `http://127.0.0.1:4000`. Local staff sign-in uses WorkOS Emulate in Docker and needs no external credentials. Sign in as `kennedy@flowfokus.com` with password `123123qwe`. To set feature flags, sign in as `dana@flowfokus.com`, the Developer. Run `docker compose run --rm server bin/rails db:seed` once when updating an existing database. See [Local staff authentication](docs/local-auth.md) for other fake users and roles. Manual payment records do not collect money.

Online checkout on the gym site needs the local test payment provider. Start Rails with `FLOWFOKUS_TEST_PAYMENTS=true docker compose up -d server jobs`. Production refuses this setting.

Docker publishes ports 4000–4002 on all IPv4 interfaces, including LAN and Tailscale. Emulator port 4100 defaults to loopback. To sign in from another device, configure the allowed development hosts and emulator binding in [Local staff authentication](docs/local-auth.md#access-from-another-device). On a Boat machine, run `scripts/links` once the stack is up instead. It prints HTTPS links for the portal and the sign-in emulator that open on any device. See [Access through a Boat link](docs/local-auth.md#access-through-a-boat-link). The optional fixed demo actor remains opt-in. Production refuses demo access. The gym site still selects the organization from its hostname.

PostgreSQL, WorkOS Emulate, all three apps, and a jobs process run in containers. The jobs process (`flowfokus-jobs`) retries lost WorkOS events and reconciles gyms. Run `db:prepare` explicitly on first setup and after adding migrations. It loads demo data into a new database. To reload demo data later, run `docker compose run --rm server bin/rails db:seed`. Data stays in the Compose volume when the stack stops with `docker compose down`.

Each app owns its Dockerfiles and image: `apps/server/Dockerfile` (production), `apps/server/Dockerfile.dev` (local), `apps/portal/Dockerfile`, and `apps/site/Dockerfile`. The two web Dockerfiles have separate `development` and `worker-build` targets. The latter produces that app's Cloudflare Worker bundle.

Compose uses the development commands in those Dockerfiles: `bin/dev` for Rails and `bun run dev` for each web app. The web scripts start Vite with hot reload.

Compose mounts the Rails app, each web app's `src` directory, and the shared API client's `src` directory from your working tree. Rails reloads on requests; Vite updates the browser as you edit. Normal code changes need no rebuild. Installed dependencies and local Worker configuration stay inside the images.

For daily use:

```sh
docker compose up -d
```

Rebuild after changing dependencies, Dockerfiles, or web configuration outside `src`:

```sh
docker compose up -d --build
```

## Run apps on the host

Install the versions in `mise.toml`, then run:

```sh
mise install
bun run setup
bun run dev
```

The apps run on the host. PostgreSQL and WorkOS Emulate still run in Docker. Stop the full Docker app stack before using these commands, because both modes use ports 4000–4002.

## Verify

Use Docker without installing the app runtimes on the host:

```sh
bash scripts/check-docker
```

Or use the installed runtimes:

```sh
bun run check
# With the local apps running:
bun run smoke:auth
bun run smoke:identity
bun run smoke:session
bun run smoke:workflows
```

The smoke workflow creates records in the local database. Tests use a separate database.

Local WorkOS changes sync through signed webhooks. Run
`docker compose exec -T server bin/rails workos:reconcile` after changing emulator
seeds or restarting it. Import, repair, and retry commands are in
[WorkOS identity sync](docs/workos-sync.md).

## Release boundary

This is a local demo and deployment candidate. Local staff authentication uses the emulator. Live WorkOS verification and cloud deployment still need credentials. Production refuses demo authentication and test payments. No real card processor is built; payments and refunds are records and move no money. See the [deployment guide](docs/deployment.md) for builds, artifacts, migration commands, and remaining requirements. The deployment steps are issues [#25](https://github.com/kennedywee/flowfokus/issues/25), [#26](https://github.com/kennedywee/flowfokus/issues/26), and [#27](https://github.com/kennedywee/flowfokus/issues/27).

The completed local checks and browser workflow are recorded in [Verification](docs/verification.md).

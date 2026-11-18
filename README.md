# Flowfokus

A membership platform for service businesses. The Rails API owns business rules. The staff portal and gym site use TanStack Start on Cloudflare Workers.

Implementation starts with [Sprint 1](docs/sprint-1.md). The agreed design is in [docs](docs/README.md).

## What works today

- Staff sign in through WorkOS and work inside one organization at a time.
- Staff manage offers, prices, benefits, locations, settings, and the team.
- Staff create members, record sales and payments, and deliver access.
- Sales support renewal at the agreed price, early delivery with a reason, refunds, voids, and revocation.
- Check-in records visits. Staff can override a denied check-in with a reason.
- Reports show real weekly figures in the organization time zone.
- Members sign in on the gym site, link their account with a desk code, and see their membership and visits.

Inbox, Agents, Notifications, Integrations, and Changelog still show labelled sample data. See [Frontend preview](docs/frontend-preview.md) for the current boundary.

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

Open the staff portal at `http://localhost:4001` and the gym site at `http://chainsaw.localhost:4002`. The API uses `http://127.0.0.1:4000`. Local staff sign-in uses WorkOS Emulate in Docker and needs no external credentials. Sign in as `demo.owner@flowfokus.test` with password `local-password`. Run `docker compose run --rm server bin/rails db:seed` once when updating an existing database. See [Local staff authentication](docs/local-auth.md) for other fake users and roles. Manual payment records do not collect money.

To try member sign-in, create a link code for a member in the portal, then sign in on the gym site. The steps are in [Member sign-in on the gym site](docs/local-auth.md#member-sign-in-on-the-gym-site).

Docker publishes ports 4000–4002 on all IPv4 interfaces, including LAN and Tailscale. Emulator port 4100 defaults to loopback. To sign in from another device, configure the allowed development hosts and emulator binding in [Local staff authentication](docs/local-auth.md#access-from-another-device). The optional fixed demo actor remains opt-in. Production refuses demo access. The gym site still selects the organization from its hostname.

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
bun run check:docker
# or, without Bun on the host:
bash scripts/check-docker
```

Or use the installed runtimes:

```sh
bun run check
# With the local apps running:
bun run smoke
bun run smoke:auth
bun run smoke:identity
bun run smoke:session
bun run smoke:workflows
```

The smoke checks create records in the local database. Tests use a separate database. CI runs `bun run check` and builds the production server image. It does not run the smoke checks.

Local WorkOS changes sync through signed webhooks. Run
`docker compose exec -T server bin/rails workos:reconcile` after changing emulator
seeds or restarting it. Import, repair, and retry commands are in
[WorkOS identity sync](docs/workos-sync.md).

## Release boundary

This is a local demo and deployment candidate. Local staff authentication uses the emulator. Live WorkOS verification and cloud deployment still need credentials. Production refuses demo authentication. See the [deployment guide](docs/deployment.md) for builds, artifacts, migration commands, and remaining requirements.

The completed local checks and browser workflow are recorded in [Verification](docs/verification.md).

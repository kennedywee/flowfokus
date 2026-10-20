# Flowfokus

A membership platform for service businesses. The Rails API owns business rules. The staff portal and gym site use TanStack Start on Cloudflare Workers.

Implementation starts with [Sprint 1](docs/sprint-1.md). The agreed design is in [docs](docs/README.md).

## Project directory

- `apps/server`: Rails 8 API and OpenAPI contract.
- `apps/portal`: staff portal.
- `apps/site`: public gym site and future signed-in member area.
- `packages/api`: generated API types and shared client.
- `scripts`: local setup and checks.
- `compose.yaml`: local services.

## Run with Docker

```sh
docker compose build
docker compose run --rm server bin/rails db:prepare
docker compose up
```

Open the staff portal at `http://localhost:3001` and the gym site at `http://chainsaw.localhost:3002`. The API uses `http://127.0.0.1:3000`. The local demo requires no external credentials. It uses sample data and records manual payments; it does not collect money.

Docker publishes ports 3000–3002 on all IPv4 interfaces, including LAN and Tailscale. Portal demo access works on any host in development when demo mode is enabled. Production still refuses demo access. The gym site still selects the organization from its hostname.

PostgreSQL and all three apps run in containers. Run `db:prepare` explicitly on first setup and after adding migrations. It loads demo data into a new database. To reload demo data later, run `docker compose run --rm server bin/rails db:seed`. Data stays in the Compose volume when the stack stops with `docker compose down`.

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

The apps run on the host. PostgreSQL still runs in Docker. Stop the full Docker app stack before using these commands, because both modes use ports 3000–3002.

## Verify

Use Docker without installing the app runtimes on the host:

```sh
bash scripts/check-docker
```

Or use the installed runtimes:

```sh
bun run check
# With the local apps running:
bun run smoke
```

The smoke workflow creates records in the local database. Tests use a separate database.

## Release boundary

This is a local demo and deployment candidate. Live WorkOS sign-in and cloud deployment need credentials in Sprint 2. Production refuses demo authentication. See the [deployment guide](docs/deployment.md) for builds, artifacts, migration commands, and remaining requirements.

The completed local checks and browser workflow are recorded in [Verification](docs/verification.md).

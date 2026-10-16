# Hydraflow

A membership platform for service businesses. The Rails API owns business rules. The staff portal and gym site use TanStack Start on Cloudflare Workers.

Implementation starts with [Sprint 1](docs/sprint-1.md). The agreed design is in [docs](docs/README.md).

## Project directory

- `apps/server`: Rails 8 API and OpenAPI contract.
- `apps/portal`: staff portal.
- `apps/site`: public gym site and future signed-in member area.
- `packages/api`: generated API types and shared client.
- `scripts`: local setup and checks.
- `infra`: local and deployment configuration.

## Run with Docker

```sh
docker compose up --build
```

Open the staff portal at `http://localhost:3001` and the gym site at `http://chainsaw.localhost:3002`. The API uses `http://127.0.0.1:3000`. The local demo requires no external credentials. It uses sample data and records manual payments; it does not collect money.

PostgreSQL and all three apps run in containers. A separate local setup container prepares the database. The production server never migrates on boot. Data stays in the Compose volume when the stack stops with `docker compose down`.

## Run with live reload

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

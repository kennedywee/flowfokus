# Deployment candidate

Sprint 1 builds a Rails container and two Cloudflare Worker bundles. It does not publish or deploy them. The local demo is the complete test path until WorkOS credentials are available.

## What can run now

- PostgreSQL and the Rails API run locally.
- The staff portal can use a fixed local demo actor.
- The gym site can show public organization details and offers.
- Production builds serve public pages. Protected requests fail closed while real authentication is unavailable.

Do not use this candidate for live member or payment data. WorkOS sign-in and token verification are a next-sprint release requirement. Manual payment recording does not collect money from a bank or card processor.

## Build and check

For a fully containerized local demo, follow [Run with Docker](../README.md#run-with-docker). Prepare the database explicitly with `docker compose run --rm server bin/rails db:prepare`, then start the stack with `docker compose up`. PostgreSQL, the API, and the two Worker emulators run in Docker. Database preparation is separate from normal app startup.

Every app has its own Dockerfile and image. Compose uses the server's `Dockerfile.dev` and the web apps' `development` targets. The server's default `Dockerfile` builds the production API. Each web app's `worker-build` target builds only its own Cloudflare bundle, using the repository root as the build context:

```sh
docker build --target worker-build -f apps/portal/Dockerfile -t hydraflow-portal:bundle .
docker build --target worker-build -f apps/site/Dockerfile -t hydraflow-site:bundle .
```

```sh
mise install
bun run setup
bun run check
docker build -t hydraflow-server:local apps/server
```

With the apps running through `bun run dev`, run `bun run smoke` in another terminal. This creates a test member and records a sale, partial payments, fulfillment, and check-ins in the local demo database. It checks retries as well as successful access. It refuses a remote API URL.

CI runs these checks on pushes to `master` and pull requests. A tag matching `v*` or a manual run of **Build release candidate** packages the verified image, Worker outputs, OpenAPI contract, and a SHA-256 manifest as one workflow artifact. This workflow needs no cloud account credentials. It does not publish a GitHub Release or registry image yet.

The full tag promotion, registry publication, preview, and approval-gated deployment design remains in [Release](release.md). Sprint 1 implements local builds, CI, and candidate packaging only. Use an `rc` tag for this sprint.

## Rails container preparation

1. Build the image from `apps/server`, or load a candidate image with `gunzip -c server-image.tar.gz | docker load`.
2. Configure the hosting platform with the image tag or image ID from the manifest. Supply `DATABASE_URL` and `SECRET_KEY_BASE` as runtime secrets. Generate the latter with `bin/rails secret`. Demo mode must remain disabled.
3. Back up the target database with `pg_dump`. Keep the backup off the server.
4. Run `bin/rails db:migrate` in the API image as a separate release step.
5. Start the image through the hosting platform. The Dockerfile defines the server command.
6. Check `/up`, `/ready`, and the public organization endpoint with `Hydraflow-Organization: <slug>`.

Configure a loopback binding and TLS reverse proxy on the VPS. Permit only Cloudflare to reach the VPS. The process never migrates on boot. Do not seed demo records in production. Hosting configuration waits for Sprint 2; Compose is local only.

Rollback starts the previous image. It does not undo data changes. Restore a verified database backup if a migration cannot be reversed safely.

## Cloudflare preparation

Build each app with its workspace `build` command. Each output includes the generated Wrangler deployment configuration. Keep that output intact when moving a candidate between machines.

The next sprint must configure the API URL, the portal host, the wildcard gym route, and the WorkOS secrets as runtime bindings. Never bake secrets into a Vite build variable. Never deploy `.dev.vars`. Verify real authentication before enabling staff or member operations.

## Credentials and decisions for Sprint 2

- WorkOS staging client ID, API key, session-cookie secret, redirect URIs, JWKS integration, and webhook verification.
- Cloudflare account, API token, zone, Worker names, routes, and runtime bindings.
- VPS access, TLS/network restrictions, image registry, PostgreSQL host, backups, and restore procedure.
- A test organization in WorkOS, with verified staff permissions and a member-linking policy.
- Confirm duration, activation, renewal, refund, and access override policies from [Decisions](decisions.md).

Verify AuthKit on Workers, CSRF checks, organization switching, revoked access, and webhook reconciliation with the real environment. These checks are required before calling the system production-ready.

## Release lab patterns

The [monorepo release lab](https://github.com/kennedywee/monorepo-release-lab) informed the Docker startup, one-tag candidate packaging, source-commit tracking, SHA-256 artifact checks, and separation between building and deploying. Hydraflow keeps PostgreSQL and Cloudflare Workers from its own accepted architecture. It does not copy the lab's SQLite or static-app hosting.

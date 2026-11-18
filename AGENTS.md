# Working agreement

Start with `docs/README.md`. It lists every design document and its topic. Read `docs/architecture.md` and `docs/monorepo.md` before implementation. Then read the home document for the topic you change. Check `docs/decisions.md` before you build on an open or proposed decision. Keep the agreed stack and domain terms.

## Writing

- Use short sentences and familiar words. Prefer active voice.
- Each topic has one home document. Link to it instead of repeating it.
- When a decision changes, update its home document and `docs/decisions.md` together.

## Git

- Branch from `master` and open a pull request. Do not push directly to `master`.
- Commit small, complete changes. Do not deploy.
- Do not erase unrelated work. Stage explicit paths.
- CI must pass before merge. It runs `bun run check` and checks for breaking API changes.

## Rails and data

- Rails owns business rules. Use models and Rails primitives. There is no default service layer.
- Use Rails `db/schema.rb`. Do not switch to `db/structure.sql`. Keep database protections reproducible through a fresh schema load.
- All tenant-owned queries must use the current organization. Verify linked records belong to that organization.

## Identity and access

- Local staff sign-in uses WorkOS Emulate in Docker. Do not require real WorkOS credentials for local work.
- Keep demo access opt-in, local-only, and disabled in production.
- Keep credentials on the server. No browser storage for access tokens.

## Local services

- Pin runtimes in `mise.toml`.
- Run supporting services in Docker. Do not install or start host PostgreSQL, Redis, or similar daemons for this project.
- Each app owns its Dockerfiles and image. Do not combine portal and site in one image.
- Keep database preparation explicit. Do not add a database setup service to Compose.
- Compose is for local development only. Keep PostgreSQL readiness, and verify app endpoints in smoke checks.
- Use explicit local container names: `flowfokus-<service>`, without numbered suffixes.
- Mount development source for Rails reloading and Vite hot updates. Code edits must not require rebuilding images.

## API and frontend

- Update the OpenAPI contract in `apps/server/openapi.yaml`. Run `bun run contract:types` to generate types. Check real API responses in request specs.
- Avoid breaking API changes. CI compares the contract with the latest stable tag, or with the base commit when no tag exists.
- Portal screens use Rails APIs where they exist. Label frontend sample data clearly, and replace it when the API lands. Keep `docs/frontend-preview.md` current.

## Verification

- Run relevant tests and builds. Use `bun run check`, or `bash scripts/check-docker` without host runtimes.
- With the apps running, run the smoke checks that cover your change: `smoke:auth`, `smoke:identity`, `smoke:session`, or `smoke:workflows`.
- Report failures and unverified deployment steps clearly.

## Scope

- Standalone passes, classes, events, reservations, waitlists, recurring billing, and a native mobile app are deferred. Do not build placeholders for them.

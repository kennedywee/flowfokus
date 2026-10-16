# Hydraflow API (`apps/server`)

Rails 8.1 API with PostgreSQL. It owns business rules, permissions, and tenant isolation.

- Contract: [`openapi.yaml`](openapi.yaml). Quick reference: [`API_NOTES.md`](API_NOTES.md).
- Environment: [`.env.example`](.env.example).

## Commands

Run from `apps/server`. The repository scripts (`bun run setup`, `bun run check`) call these for you.

| Task | Command |
| --- | --- |
| Install gems | `bundle install` |
| Prepare the database | `bin/rails db:prepare` |
| Seed demo data (idempotent) | `bin/rails db:seed` |
| Run the API with demo auth | `HYDRAFLOW_DEMO_MODE=true HYDRAFLOW_DEMO_TOKEN=hydraflow-local-demo-token bin/rails server -p 3000` |
| Run specs | `RAILS_ENV=test bin/rails db:prepare && bundle exec rspec` |
| Lint | `bin/rubocop` |
| Security scan | `bin/brakeman --no-pager` |

Specs check every real response against `openapi.yaml`. After changing the contract, run
`bun run contract:types` at the repository root and commit `packages/api/src/schema.d.ts`.

## Health checks

| Path | Use | Database |
| --- | --- | --- |
| `GET /up` | Liveness. Container health check. | Not touched |
| `GET /ready` | Readiness. Deploy smoke checks. | `SELECT 1`; 503 when down |

## Container

`Dockerfile` builds a production image. It never runs migrations on boot. Run them as a
separate release step: `docker run --rm -e DATABASE_URL=... -e SECRET_KEY_BASE=... IMAGE bin/rails db:migrate`.

## Sprint 1 limits

- WorkOS JWT/JWKS verification is not implemented. Without demo mode, protected areas return
  `503 auth_not_configured` or `503 auth_unavailable`. `/member/*` always fails closed.
- Demo authentication works only in development and test, with a fixed seeded actor.
- The Worker secret and client IP middleware is not implemented yet.

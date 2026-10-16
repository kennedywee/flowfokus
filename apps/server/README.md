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
| Run the API with demo auth | `HYDRAFLOW_DEMO_MODE=true HYDRAFLOW_DEMO_TOKEN=hydraflow-local-demo-token bin/dev -p 3000` |
| Run specs | `RAILS_ENV=test bin/rails db:prepare && bundle exec rspec` |
| Lint | `bin/rubocop` |
| Security scan | `bin/brakeman --no-pager` |

Specs check every real response against `openapi.yaml`. After changing the contract, run
`bun run contract:types` at the repository root and commit `packages/api/src/schema.d.ts`.

## Database schema

The project uses `db/schema.rb`, not `db/structure.sql`. Keep it that way.

- Composite tenant foreign keys, check constraints, and the `membership_periods_no_overlap`
  exclusion constraint dump natively into `schema.rb`.
- Immutability triggers use [Fx](https://github.com/teoljungberg/fx). Their SQL lives in
  `db/functions/*_vNN.sql` and `db/triggers/*_vNN.sql`. Migrations call `create_function` and
  `create_trigger`, and Fx dumps them into `schema.rb`. To change one, run
  `bin/rails generate fx:function NAME` (or `fx:trigger`) to make the next version.
- The triggers keep price terms, sale line items, and payments immutable. Model checks
  (`attr_readonly`, `before_update`) give the same rule a clear error first.
- `spec/db/schema_protections_spec.rb` proves the database still enforces these rules after
  the test database loads from `schema.rb`.

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

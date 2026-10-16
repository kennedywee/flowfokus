# Working agreement

Read `docs/architecture.md`, `docs/monorepo.md`, and `docs/sprint-1.md` before implementation. Keep the agreed stack and domain terms.

- Use short sentences and familiar words. Prefer active voice.
- Commit small, complete changes directly to `master` for this sprint. Do not push or deploy.
- Do not erase unrelated work. Stage explicit paths.
- Rails owns business rules. Use models and Rails primitives. There is no default service layer.
- Use Rails `db/schema.rb`. Do not switch to `db/structure.sql`. Keep database protections reproducible through a fresh schema load.
- All tenant-owned queries must use the current organization. Verify linked records belong to that organization.
- Keep demo access opt-in, local-only, and disabled in production.
- Run supporting services in Docker. Do not install or start host PostgreSQL, Redis, or similar daemons for this project.
- Each app owns its Dockerfiles and image. Do not combine portal and site in one image.
- Keep database preparation explicit. Do not add a database setup service to Compose.
- Compose is for local development only. Keep PostgreSQL readiness, and verify app endpoints in smoke checks.
- Use explicit local container names: `hydraflow-<service>`, without numbered suffixes.
- Mount development source for Rails reloading and Vite hot updates. Code edits must not require rebuilding images.
- Keep credentials on the server. No browser storage for access tokens.
- Update the OpenAPI contract, generate types, and check real API responses.
- Run relevant tests and builds. Report failures and unverified deployment steps clearly.
- Native mobile, recurring billing, classes, and reservations are deferred.

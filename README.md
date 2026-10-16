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

Setup and verification instructions will be added as the sprint is implemented.

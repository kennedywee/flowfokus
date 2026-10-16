# Architecture

## Technology

| Concern | Selection |
| --- | --- |
| Repository | Monorepo with a shared API contract. See [Monorepo](monorepo.md). |
| API | Ruby on Rails 8 (`apps/server`) |
| Web clients | TanStack Start (React) on Cloudflare Workers (`apps/portal`, `apps/site`). Each app is the BFF for its browser session. |
| Mobile client | Expo. Deferred. |
| API contract | OpenAPI, with generated TypeScript types |
| Database | PostgreSQL |
| Hosting | Rails API on a VPS. Staff portal and gym sites on Cloudflare Workers. See [Release](release.md#hosting). |
| Identity | WorkOS AuthKit. Web apps use `@workos/authkit-tanstack-react-start`. See [Authentication](authentication.md). |
| Roles and permissions | WorkOS RBAC, enforced in Rails. No Pundit. |
| Tests | RSpec, contract checks, TypeScript type checks |
| Tooling | Bun workspaces, mise |

## Responsibilities

WorkOS decides **who a user is and which staff permissions they hold**. Rails decides **which records they can access and whether an operation is valid**.

| WorkOS | Rails |
| --- | --- |
| Identity, sign-in methods (OAuth, passwords, passkeys, MFA), and sessions | Local references to users and organizations |
| Organizations | Members, locations, and all business data |
| Staff memberships and invitations | Domain rules |
| Roles, permissions, and custom roles | Permission enforcement and tenant isolation |
| SSO and Directory Sync, when required | Notifications and background jobs |

Rails stores no passwords. See [Identity](identity.md) and [Authorization](authorization.md).

## Rails code layout

Inside `apps/server`:

| Location | Contents |
| --- | --- |
| `app/models/` | Domain models and business logic |
| `app/models/concerns/` | Shared model behavior |
| `app/controllers/` | HTTP request handling |
| `app/controllers/concerns/` | Authentication and authorization |
| `app/jobs/` | Background work, including WorkOS sync |
| `app/mailers/` | Email |
| `lib/` | External integrations and infrastructure |
| Separate gems | Reusable integrations |

There is no default `app/services/` layer. Business behavior belongs in models and other Rails primitives.

## Data conventions

- Use Rails `db/schema.rb` as the schema dump. A fresh schema load must restore all database constraints and protections.
- Tables use UUID primary keys and `created_at` / `updated_at`.
- Money uses integer minor units with a currency. No floating-point money.
- Every tenant-owned record belongs to one organization. See [Authorization](authorization.md#tenant-isolation).

## Development and testing

- Local development uses the WorkOS staging environment. This is a WorkOS setting; Hydraflow has no staging deployment.
- Most tests must not call live WorkOS APIs. Use test doubles. Authentication integration tests can use staging.
- Every API response is checked against `openapi.yaml`. See [Monorepo](monorepo.md#api-contract).
- Test coverage must include: authentication, permission enforcement, member ownership, cross-organization isolation, staff and member isolation, organization switching, role changes and revoked access, and WorkOS sync.

## Extension rule

New product types must reuse the same sale, payment, and fulfillment flow. Do not build a general rules engine. Add behavior when a supported workflow needs it.

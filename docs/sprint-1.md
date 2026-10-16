# Sprint 1: runnable membership workflow

## Outcome

A developer can start three apps, view a gym's offers, create a member, record a membership sale and payment, deliver access, and check the member in. All data persists in PostgreSQL. No external account is required for local demo mode.

The release target is a tested deployment candidate. Publishing to a VPS, Cloudflare, or WorkOS is outside this sprint because credentials are not available. Production must refuse demo authentication.

## Tasks and acceptance

| ID | Task | Acceptance |
| --- | --- | --- |
| S1-01 | Repository foundation | App and package directories, working agreement, sprint plan, and existing design committed on master. |
| S1-02 | Rails foundation and identity boundary | Rails 8 API, PostgreSQL UUIDs, seeded organizations and locations, permission and tenant checks. Missing real authentication fails closed. Local demo authentication is explicit and unavailable in production. |
| S1-03 | Members and catalog | Staff can list/create members and list offers/prices. Public API exposes only published gym details and available offers. Prices used by sales remain immutable. |
| S1-04 | Membership workflow | Record a sale and manual payment; fulfill a fully paid line once; create membership periods and entitlements; renew without overlap; check in once per request key. Tenant and concurrency tests cover sensitive writes. |
| S1-05 | Shared API contract | OpenAPI describes implemented endpoints. RSpec checks real responses. Generated TypeScript types and a shared client serve both apps. |
| S1-06 | Staff portal | Usable organization view, member creation, sale/payment/fulfillment, check-in, loading/error/empty states, responsive layout. All API access goes through server code. |
| S1-07 | Gym site | Host resolves the gym. Public details and offers load from Rails. Unknown/reserved hosts fail. Missing sign-in configuration has a clear state. |
| S1-08 | Local and release tooling | Pinned runtimes, Bun workspaces, lockfiles, local PostgreSQL, setup/check scripts, CI, Rails container, Worker bundles, configuration examples, deployment runbook. No automatic production deployment. |
| S1-09 | Verification and handoff | Specs, contract generation, type checks, app builds, HTTP/browser workflow checks, clean committed master, and precise credential blockers recorded. |

## Implementation boundaries

Use a narrow first workflow where the design leaves choices open. These are implementation limits for the demo, not new accepted product policy:

- A membership sale has one recipient and one line, quantity one. Money uses integer minor units.
- Record cash or bank-transfer payments. No card processor and no claim that money moved externally.
- Use fixed-duration membership terms, snapshotted at purchase. Show the duration clearly. Calendar-month rules remain open.
- Start new access at purchase time. Early renewal appends after the latest period. Use UTC instants and the organization's timezone for display.
- Fully paid sales can fulfill. Early fulfillment, refunds, revocation, manual overrides, and adjustments wait for the next sprint.
- Entitlements authorize check-in. Keep counted and unlimited access. Denied attempts consume nothing.
- Local demo actors use fixed seeded identities and explicit permissions. They cannot supply arbitrary claims from the browser.
- Protected production operations stay unavailable until WorkOS configuration and integration verification are complete. Never use demo identities as a production substitute.

## Worker ownership

Claude Opus 5.5 implements the API and web apps. Shared-checkout work uses separate paths. The coordinating agent owns root tooling, infrastructure, integration checks, and final documentation. Workers commit their own complete changes to master and never stage other workers' files.

## Next sprint

Provide WorkOS staging settings, Cloudflare access, VPS/registry details, and the deployment domain configuration. Complete verified AuthKit sessions, JWT/JWKS verification and sync, trusted Worker/client-IP middleware, member linking, credentialed deployment smoke tests, and the remaining first-release workflows. Resolve the open product policies in `decisions.md` before expanding the demo's limits.

Local acceptance evidence is in [Verification](verification.md). Live authentication and external deployment are next-sprint requirements.

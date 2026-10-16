# Decisions

Status of each design decision. The rules themselves live in the linked documents.

## Accepted

| Decision | Home |
| --- | --- |
| Rails 8, WorkOS AuthKit, RSpec. | [Architecture](architecture.md#technology) |
| WorkOS owns identity and staff access. Rails owns business data and rules. | [Architecture](architecture.md#responsibilities) |
| No default service layer. Integrations in `lib/` or gems. | [Architecture](architecture.md#rails-code-layout) |
| Monorepo: Rails API, React staff and member apps, Expo later. Bun workspace and mise. | [Monorepo](monorepo.md#layout) |
| `openapi.yaml` is the single source of API types. CI blocks breaking changes. | [Monorepo](monorepo.md#api-contract) |
| One tag releases every app. Candidates, then stable on the same commit. | [Release](release.md#flow) |
| Build once, promote the artifact. Deploys are manual with approval. | [Release](release.md#rules) |
| Migrations stay backward compatible. No migration on boot. | [Release](release.md#server-deployment) |
| PostgreSQL. | [Architecture](architecture.md#technology) |
| Rails API on a VPS. Staff portal and gym sites are TanStack Start apps on Cloudflare Workers. | [Release](release.md#hosting) |
| Hosts: `api.hydraflow.com`, `portal.hydraflow.com` (staff), `<slug>.hydraflow.com` (gym site). | [Authentication](authentication.md#hosts) |
| TanStack Start is the BFF. Encrypted, host-only session cookie from the WorkOS TanStack Start SDK. Start calls Rails with Bearer tokens. Rails accepts Bearer tokens only. | [Authentication](authentication.md#design-tanstack-start-is-the-bff) |
| API areas by path: `/staff`, `/member`, `/public`. The gym is named by the `Hydraflow-Organization` header. Rails never reads host headers. | [Authentication](authentication.md#api-areas) |
| Workers send a shared secret. Rails trusts the forwarded client IP only with it. | [Authentication](authentication.md#worker-secret-and-client-ip) |
| Local gym sites run on `<slug>.localhost`. | [Monorepo](monorepo.md#local-development) |
| Mobile, when built, uses WorkOS PKCE and Bearer tokens. | [Authentication](authentication.md#mobile) |
| `Organization` is the tenant, not `Account`. Branches are `Location`s. | [Identity](identity.md#organization) |
| One identity per person. Separate staff portal and member area. | [Identity](identity.md#staff-portal-and-member-area) |
| Apps are named `portal` (staff) and `site` (gym site: public pages, shop, member area). | [Monorepo](monorepo.md#layout) |
| Staff are WorkOS memberships. Customers are Rails `Member`s. | [Identity](identity.md#models) |
| WorkOS sync is verified, idempotent, and order-safe. | [Identity](identity.md#workos-sync) |
| WorkOS RBAC without Pundit. No local role tables. | [Authorization](authorization.md#permissions) |
| Permissions, tenant scope, and business rules are separate checks. | [Authorization](authorization.md) |
| Staff management through Hydraflow UI and WorkOS API. | [Authorization](authorization.md#staff-management) |
| Four-stage Benefit Delivery Cycle. Memberships first. | [Benefit Delivery Cycle](benefit-delivery-cycle.md) |
| Products have many immutable prices. | [Models](models.md#product-stage) |
| Start-inclusive, end-exclusive time boundaries. | [Models](models.md#shared-rules) |
| One membership per member by default. Renewal adds a period. | [Models](models.md#fulfillment-stage) |
| Counted and unlimited access in the first release. | [Models](models.md#entitlement-stage) |
| Partial payment allowed. Fulfill after full payment unless staff authorize. | [Workflows](workflows.md#purchase-and-fulfill) |
| Activation is configurable. Default is the purchase date. | [Workflows](workflows.md#purchase-and-fulfill) |
| Early renewal keeps the cycle. Renewal keeps the agreed price. | [Workflows](workflows.md#renew) |

## Proposed

Not yet confirmed.

| Topic | Proposal |
| --- | --- |
| Access authority | Authorize check-ins through entitlements only. Membership status alone does not grant access. |
| Purchased terms | Save them when the sale is confirmed. |
| Revocation | Affect only delivery from the refunded purchase. |

## Open

### Identity and access

| Topic | Question |
| --- | --- |
| Staff locations | Can staff access be limited to some locations? WorkOS roles cover the whole organization. |
| Permission set | Which permissions does each workflow need? Which default roles ship? |
| Stale sessions | How fast must role changes and revoked access take effect? |
| Member linking | Which verification flow links a member to a user? Self-service or staff invite? |
| Access overrides | Can staff grant access without an entitlement? Which permission controls it? |

### Monorepo and release

| Topic | Question |
| --- | --- |
| Signed-in previews | Do PR previews need sign-in? If yes, which preview host names? |
| Sign-in branding | Can the AuthKit page show the gym's brand on its gym site, or only Hydraflow's? |
| Member sign-up | Can a new customer create their own member record from the gym site? |
| Sign-out scope | Does signing out on one host end the WorkOS session everywhere? |
| SDK on Workers | Does `@workos/authkit-tanstack-react-start` run on Cloudflare Workers with `nodejs_compat`? |
| Astro | Which pages, if any, use Astro? A Hydraflow marketing site, or gym site public pages? |
| Database host | Does PostgreSQL run on the VPS or as a managed service? |
| Mobile scope | In which release does the mobile app become part of the plan? |

### Catalog and purchase

| Topic | Question |
| --- | --- |
| Launch business | Which membership workflow defines the first release? |
| Price terms | Which terms belong to Price, and which to the offer? |
| Duration | Where is duration configured, and how does it relate to benefit validity? |
| Purchased terms storage | Immutable benefit versions or sale snapshots? |
| Agreed price | How is it stored, with discounts? How are changes recorded? |
| Buyer and recipient | Can someone buy for another person? |
| Quantity | Is each membership line limited to quantity one? |
| Early fulfillment | Is a reason required? How is payment allocated across line items? |
| Refunds and voids | Partial refunds? Default revocation? When can a sale be voided? |

### Memberships and access

| Topic | Question |
| --- | --- |
| Activation | Which modes exist, where are they set, and what defines purchase time? |
| Renewal dates | How does expired renewal work? How are short months handled? |
| Membership limit | Does the limit apply to active or all memberships? Configurable? Product changes? |
| Unlimited access | How is it represented? |
| Usage accounting | Audited allocation states or an append-only ledger? How are adjustments stored? |
| Location scope | Are benefits valid at all locations by default? |
| Timezone | Which timezone sets period boundaries, especially across locations? |

## Deferred

Standalone passes, classes, events, reservations, waitlists, recurring billing, a native mobile app, and a Hydraflow staging environment.

Custom gym site domains are deferred. The BFF design already supports them. When they arrive, add `OrganizationDomain`, domain verification, Cloudflare custom hostnames, a WorkOS redirect URI per domain (or a central callback with a handoff code), and a domain lookup in the host resolver. See [Authentication](authentication.md#custom-domains-deferred). Decide then how a gym verifies its domain and who pays for custom hostnames.

When reservations arrive, define holds, releases, cancellation, no-shows, capacity, and expiry. Decide then whether classes and events share one model.

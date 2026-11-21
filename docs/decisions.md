# Decisions

The accepted design decisions. The rules themselves live in the linked documents.

Questions that are not decided are GitHub issues with the [`decision` label](https://github.com/kennedywee/flowfokus/issues?q=is%3Aissue+is%3Aopen+label%3Adecision). When one is decided, record the rule in its home document, add a row here, and close the issue.

## Accepted

| Decision | Home |
| --- | --- |
| `master` is the integration branch. Changes arrive by pull request. | [Working agreement](../AGENTS.md#git) |
| Use Rails `db/schema.rb`, including a verified fresh schema load. | [Architecture](architecture.md#data-conventions) |
| Rails 8, WorkOS AuthKit, RSpec. | [Architecture](architecture.md#technology) |
| The staff portal builds its components on ui-sdk, pinned to an exact beta version, with Tailwind CSS v4. Components keep the portal look through its own CSS and tokens. | [Portal README](../apps/portal/README.md#ui-components) |
| The staff portal has System, Light, and Dark themes. Dark keeps the Paper colours. The choice is a display preference in a cookie. | [Portal README](../apps/portal/README.md#ui-components) |
| The Paper file "Flowfokus Design" is the portal's design reference. It sets zinc colours, Geist and Geist Mono, a 6, 8, 10, 12 radius, and one icon set. The portal uses its own icons, not Hugeicons (closes #16). It replaces the 18 Nov rules in `docs/paper-redesign` (Figtree, neutral greys, grey table band). | [Portal design](../apps/portal/DESIGN.md#colors) |
| WorkOS owns identity and staff access. Rails owns business data and rules. | [Architecture](architecture.md#responsibilities) |
| No default service layer. Integrations in `lib/` or gems. | [Architecture](architecture.md#rails-code-layout) |
| Monorepo: Rails API, React staff and member apps, Expo later. Bun workspace and mise. | [Monorepo](monorepo.md#layout) |
| `openapi.yaml` is the single source of API types. CI blocks breaking changes. | [Monorepo](monorepo.md#api-contract) |
| One tag releases every app. Candidates, then stable on the same commit. | [Release](release.md#flow) |
| Build once, promote the artifact. Deploys are manual with approval. | [Release](release.md#rules) |
| PR previews run on Boat: one sandbox per PR with the full local stack. Sign-in uses WorkOS Emulate, so a preview needs no redirect URI. | [Release](release.md#pull-request-previews) |
| Migrations stay backward compatible. No migration on boot. | [Release](release.md#server-deployment) |
| PostgreSQL. | [Architecture](architecture.md#technology) |
| Rails API on a VPS. Staff portal and gym sites are TanStack Start apps on Cloudflare Workers. | [Release](release.md#hosting) |
| Hosts: `api.flowfokus.com`, `portal.flowfokus.com` (staff), `<slug>.flowfokus.com` (gym site). | [Authentication](authentication.md#hosts) |
| TanStack Start is the BFF. Encrypted, host-only session cookie from the WorkOS TanStack Start SDK. Start calls Rails with Bearer tokens. Rails accepts Bearer tokens only. | [Authentication](authentication.md#design-tanstack-start-is-the-bff) |
| API areas by path: `/staff`, `/member`, `/public`. The gym is named by the `Flowfokus-Organization` header. Rails never reads host headers. | [Authentication](authentication.md#api-areas) |
| Workers send a shared secret. Rails trusts the forwarded client IP only with it. | [Authentication](authentication.md#worker-secret-and-client-ip) |
| Local staff authentication uses WorkOS Emulate in Docker with seeded fake identities. Live WorkOS staging remains an integration check. | [Local staff authentication](local-auth.md) |
| Local gym sites run on `<slug>.localhost`. | [Monorepo](monorepo.md#local-development) |
| Mobile, when built, uses WorkOS PKCE and Bearer tokens. | [Authentication](authentication.md#mobile) |
| `Organization` is the tenant, not `Account`. Branches are `Location`s. | [Identity](identity.md#organization) |
| One identity per person. Separate staff portal and member area. | [Identity](identity.md#staff-portal-and-member-area) |
| Apps are named `portal` (staff) and `site` (gym site: public pages, shop, member area). | [Monorepo](monorepo.md#layout) |
| Staff are WorkOS memberships. Customers are Rails `Member`s. | [Identity](identity.md#models) |
| WorkOS sync is verified, idempotent, and order-safe. | [Identity](identity.md#workos-sync) |
| WorkOS RBAC without Pundit. No local role tables. | [Authorization](authorization.md#permissions) |
| Permissions, tenant scope, and business rules are separate checks. | [Authorization](authorization.md) |
| Staff management through Flowfokus UI and WorkOS API. | [Authorization](authorization.md#staff-management) |
| Four-stage Benefit Delivery Cycle. Memberships first. | [Benefit Delivery Cycle](benefit-delivery-cycle.md) |
| Products have many immutable prices. | [Models](models.md#product-stage) |
| Start-inclusive, end-exclusive time boundaries. | [Models](models.md#shared-rules) |
| One membership per member by default. Renewal adds a period. | [Models](models.md#fulfillment-stage) |
| Counted and unlimited access in the first release. | [Models](models.md#entitlement-stage) |
| Partial payment allowed. Fulfill after full payment unless staff authorize. | [Workflows](workflows.md#purchase-and-fulfill) |
| Activation is configurable. Default is the purchase date. | [Workflows](workflows.md#purchase-and-fulfill) |
| Early renewal keeps the cycle. Renewal keeps the agreed price. | [Workflows](workflows.md#renew) |
| Programs (group classes, events, appointments) with dated occurrences. Not "listing" or "activity". | [Models](models.md#program-stage) |
| Product stays. A ticket is a product kind made from a program. Passes are a product kind too. | [Models](models.md#product-stage) |
| A booking always uses one entitlement. Program benefits cover every program, one kind, or selected programs. | [Workflows](workflows.md#book) |
| Members book and pay on the gym site. Online checkout holds the spot; the sale is created when payment succeeds. | [Workflows](workflows.md#buy-online) |
| One ticket purchase can book up to ten spots. The buyer holds the right; attendees are members or guests by name. Online buyers name only themselves and guests. | [Workflows](workflows.md#book) |
| Entitlements authorize check-ins. Membership status alone grants no access. | [Models](models.md#entitlement-stage) |
| A right with no usage limit is unlimited. A right with no location is valid at every location. | [Models](models.md#entitlement-stage) |
| A sale line saves its purchased terms. Later catalog edits never change it. | [Models](models.md#purchase-stage) |
| A refund never changes access. Revocation is a separate action and ends only one sale's delivery. | [Workflows](workflows.md#refund-or-revoke) |
| A sale can be voided only before delivery, when it keeps no money. | [Workflows](workflows.md#refund-or-revoke) |
| Staff with `check_ins:override` can let a denied member in once, with a reason. It uses no right. | [Workflows](workflows.md#check-in) |
| A member links a sign-in with a one-time code that staff issue. A matching email is not enough. | [Identity](identity.md#member-customer) |
| Three default roles: Owner, Manager, Receptionist. | [Authorization](authorization.md#implemented-permissions) |
| The staff portal sidebar has five pages: Calendar, Members, Sales, Programs, and Products. Home, Inbox, Agents, the Check-ins page, Reports, Integrations, and What's new left the scope on 21 November 2026. `/<org>` opens the first page the role can read, which is Calendar (the schedule route) until it is built. | [Frontend preview](frontend-preview.md) |
| The staff portal shell is a rounded window on a tinted frame, with a darker sidebar, a breadcrumb top bar, and the account control at the foot. The sidebar and ⌘K list only the pages a role can read. The location crumb shows on every page, including Calendar. | [Portal design](../apps/portal/DESIGN.md#redesign-foundation) |
| The redesigned screens share one set of parts (list table, filter bar, Display popover, row selection, groups, detail layout, hero, activity, background patterns, data marks) in `components/parts/`. Each screen issue moves a screen onto them; the older list toolbar, pager, and table state stay until then. A status mark always has a text label from Rails. | [Portal design](../apps/portal/DESIGN.md#shared-parts-issue-87) |
| A sale has no number in Rails yet, so the sale page title is the product name. "Sale #1058" waits for sale numbers. Record payment (P) and Fulfill items (F) are in the page's section headers; Refund, Revoke access, and Void stay in its more menu. | [Portal design](../apps/portal/DESIGN.md#shared-parts-issue-87) |
| A product page lists every price (Name, Length, Status, Price). A new amount or length is a new price that staff add on that page; they then take the old one off sale or archive it. Edit product has no price fields, because Rails never changes a price a sale may use. | [Portal design](../apps/portal/DESIGN.md#shared-parts-issue-87) |
| Check-in for a booked member is on the Session details page only: the row's status mark, A, the row menu, and Check in on the floating bar over chosen rows. Rails has no bulk call, so the bar sends its single attend call once per row; attending a member who is already here changes nothing, so a retry or a stale page is safe. No-show waits for Rails. | [Portal design](../apps/portal/DESIGN.md#shared-parts-issue-87) |

## Deferred

Waitlists, courses, staff calendars for appointments, recurring billing, a native mobile app, and a Flowfokus staging environment are not built. The Home, Inbox, Agents, Check-ins, and Reports pages are not built either. Check-in stays on the member page and ⌘K. Rails keeps the check-in endpoints, until [#81](https://github.com/kennedywee/flowfokus/issues/81) is decided.

Only the local test payment provider exists. A real provider waits on [#9](https://github.com/kennedywee/flowfokus/issues/9).

Custom gym site domains are not built. The BFF design already supports them. They need `OrganizationDomain`, domain verification, Cloudflare custom hostnames, a WorkOS redirect URI per domain (or a central callback with a handoff code), and a domain lookup in the host resolver. See [Authentication](authentication.md#custom-domains-deferred).

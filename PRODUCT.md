# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Front-desk staff** (confirmed). They work at a gym's front desk on a laptop or tablet. They create members, sell memberships, record cash or bank-transfer payments, deliver access, and check members in. A customer often waits in front of them, so tasks must be quick and errors must be clear.
- **Gym owners and managers** (confirmed). They use the same staff portal. They review members, sales that still have a balance, and sales that wait for fulfillment. They have more time but need accurate facts.
- **The public** (from docs). They visit a gym's site at `<slug>.flowfokus.com` to see the gym's locations and membership offers.
- **Members** (from docs, deferred). The signed-in member area on the gym site is not available in Sprint 1.

## Product Purpose

Flowfokus is a membership platform for service businesses, starting with gyms. It records the full Benefit Delivery Cycle: an offer is sold, paid, fulfilled into a membership period with entitlements, and used at check-in. Success in Sprint 1: a developer starts three apps and completes the workflow end to end with real data in PostgreSQL.

## Positioning

Every right a member uses traces back to a purchase. Sale, payment, fulfillment, and entitlement are separate, recorded facts. A check-in is granted or denied from entitlements, and a denial always has a stated reason. Past sales keep their price and terms.

## Operating Context

- Staff portal: one build at `portal.flowfokus.com`. Staff choose the organization in the URL, `/<slug>/…`.
- Gym site: one build serves every gym. The host chooses the gym, `<slug>.flowfokus.com` or `<slug>.localhost:3002` in development.
- Both web apps are TanStack Start on Cloudflare Workers. They are the backend for frontend. The browser never calls Rails and never holds an access token.
- Money is integer minor units with a currency. Times are UTC and display in the organization's time zone.
- Seed gyms: Chainsaw Gym (Bangsar, Mont Kiara, MYR), Ironworks Fitness (Penang, MYR).

## Capabilities and Constraints

Sprint 1 limits (implementation limits, not product policy):

- One recipient and one line per sale, quantity one.
- Manual payments only: cash or bank transfer. Partial payment is allowed. No card processor, and no claim that money moved.
- Fixed-duration terms, snapshotted at purchase.
- Fulfill only fully paid sales. Fulfillment is idempotent.
- Check-in denials record one of: no entitlement, location not allowed, usage limit reached. Denied attempts consume nothing.
- Local demo sign-in is opt-in, local development only, and uses one fixed seeded actor (Demo Owner, Chainsaw). Production refuses it.
- WorkOS sign-in is not integrated yet. Production shows sign-in as unavailable and protected actions fail closed.

Deferred: native mobile, recurring billing, classes, reservations, refunds, revocation, overrides, member sign-in, online purchase.

Rails owns all business rules. The web apps only help users fill forms and show results.

## Brand Commitments

- Product name: Flowfokus. Gym sites carry the gym's own name.
- Voice: short sentences, familiar words, active voice (from the working agreement).

## Evidence on Hand

- Product docs in `docs/`. API contract in `apps/server/openapi.yaml`.
- No logos, photography, testimonials, customer quotes, or usage metrics exist. Do not invent them.
- Gym names, locations, offers, and prices come only from the API.

## Product Principles

1. The record is the truth. Show what Rails returned; never imply an outcome that did not happen.
2. Every denial and error names the reason and the next step.
3. The front-desk task comes first. A customer is waiting.
4. Local demo is clearly local demo. Never present it as real sign-in.
5. Fail closed. Missing configuration disables protected actions and says why.

## Accessibility & Inclusion

Keyboard operation for every task, visible focus, labelled form controls, inline errors linked to their fields, and status changes announced to assistive technology. Target WCAG 2.2 AA.

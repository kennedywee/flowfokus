# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Front-desk staff** (confirmed). They work at a gym's front desk on a laptop or tablet. They create members, sell memberships, record cash or bank-transfer payments, deliver access, and check members in. A customer often waits in front of them, so tasks must be quick and errors must be clear.
- **Gym owners and managers** (confirmed). They use the same staff portal. They review members, sales that still have a balance, and sales that wait for fulfillment. They have more time but need accurate facts.
- **The public** (from docs). They visit a gym's site at `<slug>.flowfokus.com` to see the gym's locations and membership offers.
- **Members** (from docs). They sign in on their gym's site, link their sign-in with a code from the front desk, and see their membership, rights left, bookings, and payments.

## Product Purpose

Flowfokus is a membership platform for service businesses, starting with gyms. It records the full Benefit Delivery Cycle: an offer is sold, paid, fulfilled into a membership period with entitlements, and used for bookings. Success in Sprint 1: a developer starts three apps and completes the workflow end to end with real data in PostgreSQL.

## Positioning

Every right a member uses traces back to a purchase. Sale, payment, fulfillment, and entitlement are separate, recorded facts. A booking is granted or refused from entitlements, and a refusal always has a stated reason. Past sales keep their price and terms.

## Operating Context

- Staff portal: one build at `portal.flowfokus.com`. Staff choose the organization in the URL, `/<slug>/…`.
- Gym site: one build serves every gym. The host chooses the gym, `<slug>.flowfokus.com` or `<slug>.localhost:4002` in development.
- Both web apps are TanStack Start on Cloudflare Workers. They are the backend for frontend. The browser never calls Rails and never holds an access token.
- Money is integer minor units with a currency. Times are UTC and display in the organization's time zone.
- Seed gyms: Chainsaw (Bangsar, Mont Kiara, MYR), Irongate (George Town, MYR).

## Capabilities and Constraints

Use [Workflows](docs/workflows.md) for business behavior, the OpenAPI contract
for the implemented API, and [Verification](docs/verification.md) for tested
capabilities and release limits. Do not copy those rules into this file.

Rails owns business rules. Web apps show records, collect input, and display
confirmed results. The stack and ownership are in [Architecture](docs/architecture.md).

## Brand Commitments

- Product name: Flowfokus. Gym sites carry the gym's own name.
- Voice: short sentences, familiar words, active voice (from the working agreement).

## Evidence on Hand

- Product docs in `docs/`. API contract in `apps/server/openapi.yaml`.
- The portal has existing logo assets. Do not invent photography, testimonials, customer quotes, or usage metrics.
- Gym names, locations, offers, and prices come only from the API.

## Product Principles

Simple purpose, architecture, design, and implementation. Each change should
make the product easier to use and its code easier for people and agents to
understand. Use layout and clear controls instead of taglines and routine helper
text. Preserve facts, accessibility, and the consequences of an action.


1. The record is the truth. Show what Rails returned; never imply an outcome that did not happen.
2. Every denial and error names the reason and the next step.
3. The front-desk task comes first. A customer is waiting.
4. Local demo is clearly local demo. Never present it as real sign-in.
5. Fail closed. Missing configuration disables protected actions and says why.

## Accessibility & Inclusion

Keyboard operation for every task, visible focus, labelled form controls, inline errors linked to their fields, and status changes announced to assistive technology. Target WCAG 2.2 AA.

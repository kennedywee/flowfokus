# Flowfokus

Flowfokus is a membership platform for service businesses, such as gyms. It sells memberships, delivers their benefits, and records how members use them.

These documents describe the design. Implementation starts with [Sprint 1](sprint-1.md). The current deployment boundary is in [Deployment candidate](deployment.md).

**Principle:** One identity. Multiple organizations. Separate staff and customer relationships.

## Documents

| Document | Covers |
| --- | --- |
| [Sprint 1](sprint-1.md) | Task split, acceptance checks, demo limits, and next-sprint work. |
| [Deployment candidate](deployment.md) | Candidate builds, local deployment files, and required credentials. |
| [Verification](verification.md) | Local checks, browser workflow, schema protections, and unverified release steps. |
| [Design system](design-system.md) | App tokens, components, blocks, agent rules, and screen review. |
| [Architecture](architecture.md) | Technology, WorkOS and Rails responsibilities, Rails code layout, testing. |
| [Monorepo](monorepo.md) | Apps, shared packages, API contract, local development. |
| [Release](release.md) | Tags, CI, candidates, deployment, hotfixes, mobile delivery. |
| [Local staff authentication](local-auth.md) | Emulator setup, fake users, permissions, and local verification. |
| [WorkOS identity sync](workos-sync.md) | Local webhooks, initial import, recovery commands, and release limits. |
| [Authentication](authentication.md) | Hosts, BFF sign-in for staff and members, mobile tokens. |
| [Identity](identity.md) | Users, organizations, staff, members, staff portal, member area, WorkOS sync. |
| [Authorization](authorization.md) | Permissions, enforcement, tenant isolation, staff management. |
| [Feature flags](feature-flags.md) | Off, Labs, and On per organization, the Developer role's page, and the gym site flag. |
| [Benefit Delivery Cycle](benefit-delivery-cycle.md) | The four stages of the business domain. |
| [Models](models.md) | Domain records and their rules. |
| [Workflows](workflows.md) | Purchase, renewal, attendance, refund, and adjustment flows. |
| [Decisions](decisions.md) | Accepted decisions and deferred scope. |

## First release

- Organizations and locations.
- Staff access with WorkOS roles, including custom roles.
- Member records, with optional member sign-in on the gym site.
- Membership products with many immutable prices and benefits.
- Sales, line items, and payment recording.
- Membership fulfillment, periods, activation, renewal, and expiry.
- Benefit grants, entitlements, limited and unlimited access, and bookings.
- Manual adjustments and basic refunds.

Standalone passes, classes, events, reservations, waitlists, recurring billing, walk-in gym check-in, and a native mobile app are deferred. So are the Home, Inbox, Agents, Check-ins, and Reports pages. Do not build placeholders for them.

## Rules for these documents

- Each topic has one home document. Other documents link to it. They do not repeat it.
- Documents state agreed rules and what is built. Questions that are not decided, and work to do, are GitHub issues. A full proposed design gets its own document, marked **Status: proposed** at the top.
- When a decision is made or changes, update its home document and `decisions.md` together, and close its issue.

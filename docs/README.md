# Hydraflow

Hydraflow is a membership platform for service businesses, such as gyms. It sells memberships, delivers their benefits, and records how members use them.

These documents describe the design. Implementation starts with [Sprint 1](sprint-1.md). The current deployment boundary is in [Deployment candidate](deployment.md).

**Principle:** One identity. Multiple organizations. Separate staff and customer relationships.

## Documents

| Document | Covers |
| --- | --- |
| [Sprint 1](sprint-1.md) | Task split, acceptance checks, demo limits, and next-sprint work. |
| [Deployment candidate](deployment.md) | Candidate builds, local deployment files, and required credentials. |
| [Architecture](architecture.md) | Technology, WorkOS and Rails responsibilities, Rails code layout, testing. |
| [Monorepo](monorepo.md) | Apps, shared packages, API contract, local development. |
| [Release](release.md) | Tags, CI, candidates, deployment, hotfixes, mobile delivery. |
| [Authentication](authentication.md) | Hosts, BFF sign-in for staff and members, mobile tokens. |
| [Identity](identity.md) | Users, organizations, staff, members, staff portal, member area, WorkOS sync. |
| [Authorization](authorization.md) | Permissions, enforcement, tenant isolation, staff management. |
| [Benefit Delivery Cycle](benefit-delivery-cycle.md) | The four stages of the business domain. |
| [Models](models.md) | Domain records and their rules. |
| [Workflows](workflows.md) | Purchase, renewal, check-in, refund, and adjustment flows. |
| [Decisions](decisions.md) | Decision status: accepted, proposed, open, deferred. |

## First release

- Organizations and locations.
- Staff access with WorkOS roles, including custom roles.
- Member records, with optional member sign-in on the gym site.
- Membership products with many immutable prices and benefits.
- Sales, line items, and payment recording.
- Membership fulfillment, periods, activation, renewal, and expiry.
- Benefit grants, entitlements, limited and unlimited access, and check-ins.
- Manual adjustments, basic refunds, and basic reporting.

Standalone passes, classes, events, reservations, waitlists, recurring billing, and a native mobile app are deferred. Do not build placeholders for them.

## Rules for these documents

- Each topic has one home document. Other documents link to it. They do not repeat it.
- Topic documents state agreed rules only. Proposed and open items live in [Decisions](decisions.md). A full proposed design gets its own document, marked **Status: proposed** at the top.
- When a decision changes, update its home document and `decisions.md` together.

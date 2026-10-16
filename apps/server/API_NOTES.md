# Hydraflow API notes (Sprint 1)

`openapi.yaml` is the source of truth. This page is a short reference for the web apps.

## Call rules

- Base URL in development: `http://localhost:3000`.
- Call Rails from server code only. Never from the browser.
- Send `Hydraflow-Organization: <slug>` on every `/public/*`, `/staff/*`, and `/member/*` call.
- Send `Authorization: Bearer <token>` on `/staff/*` and `/member/*`.
- Send `Content-Type: application/json` on writes. Bodies are flat objects (no `{ member: {...} }` wrapper).
- Send `Idempotency-Key: <uuid>` on `POST /staff/sales`, `POST /staff/sales/:id/payments`, and `POST /staff/check_ins`. Reuse the same key only to retry the same request.
- Success: `{ "data": <object or array> }`. Error: `{ "error": { "code", "message", "details"? } }`.
- Money: integer minor units plus ISO 4217 currency, for example `{ "amount_minor": 12000, "currency": "MYR" }` is RM120.00.
- Times: UTC ISO 8601. Show them in the organization `timezone`.

## Local demo authentication

| Variable | Example | Effect |
| --- | --- | --- |
| `HYDRAFLOW_DEMO_MODE` | `true` | Turns on the demo actor. Development and test only. Rails refuses to boot with it in production. |
| `HYDRAFLOW_DEMO_TOKEN` | `hydraflow-local-demo-token` | The Bearer value the portal server sends. At least 16 characters. |

- The demo token maps to fixed claims: seeded user `Demo Owner <demo.owner@hydraflow.test>`, organization `chainsaw`, all Sprint 1 permissions.
- The browser cannot choose the claims. The portal server keeps the token.
- The demo token works only for `Hydraflow-Organization: chainsaw`. Other slugs give `403 organization_mismatch`.
- The demo actor is staff only. `/member/*` gives `403`.
- Without demo mode and without WorkOS, protected calls give `503 auth_not_configured`. A missing token always gives `401 unauthenticated`.
- WorkOS JWT verification is **not** implemented in Sprint 1. A configured WorkOS still gives `503 auth_unavailable`.

## Seed data

Run `bin/rails db:seed`. It is idempotent.

| Slug | Name | Published | Locations | Currency |
| --- | --- | --- | --- | --- |
| `chainsaw` | Chainsaw Gym | yes | Bangsar, Mont Kiara | MYR |
| `ironworks` | Ironworks Fitness | yes | Penang | MYR |
| `hidden` | Hidden Gym | no | one | MYR |

Chainsaw products:

| Product | Price | Duration | Benefit |
| --- | --- | --- | --- |
| Monthly Unlimited | RM120.00 (12000) | 30 days | Unlimited gym access, all locations |
| Monthly 8 Visits | RM80.00 (8000) | 30 days | 8 visits per period, all locations |
| Bangsar Weekly | RM35.00 (3500) | 7 days | Unlimited, Bangsar only |
| Monthly Unlimited (old) | RM100.00, archived | 30 days | Kept for history |
| Staff Trial | RM0, unpublished product | 7 days | Staff list only |

Chainsaw members: Aisyah Rahman, Ben Tan, Chloe Lim. Ironworks has its own members and products.

## Endpoints

| Method | Path | Permission | Success | Body |
| --- | --- | --- | --- | --- |
| GET | `/up` | none | 200 | liveness, no database |
| GET | `/ready` | none | 200 / 503 | runs `SELECT 1` |
| GET | `/public/organization` | none | 200 `PublicOrganization` | |
| GET | `/public/products` | none | 200 `PublicProduct[]` | |
| GET | `/staff/organization` | staff | 200 `StaffOrganization` (locations, actor permissions) | |
| GET | `/staff/overview` | staff | 200 `StaffOverview` | |
| GET | `/staff/members?q=` | `members:read` | 200 `Member[]` | |
| POST | `/staff/members` | `members:create` | 201 `Member` | `{ name, email }` |
| GET | `/staff/members/:id` | `members:read` | 200 `MemberDetail` | |
| GET | `/staff/products` | `products:read` | 200 `StaffProduct[]` | |
| GET | `/staff/sales?member_id=` | `purchases:read` | 200 `Sale[]` | |
| POST | `/staff/sales` | `purchases:create` | 201 `Sale` (200 on replay) | `{ member_id, price_id, location_id }` |
| GET | `/staff/sales/:id` | `purchases:read` | 200 `Sale` | |
| POST | `/staff/sales/:id/payments` | `payments:create` | 201 `Sale` (200 on replay) | `{ amount_minor, method, reference? }` |
| POST | `/staff/sales/:id/fulfill` | `purchases:fulfill` | 201 `Sale` (200 if already fulfilled) | none |
| GET | `/staff/check_ins?member_id=` | `check_ins:read` | 200 `CheckIn[]` (max 100) | |
| POST | `/staff/check_ins` | `check_ins:create` | 201 `CheckIn` (200 on replay) | `{ member_id, location_id }` |
| GET | `/member/profile` | member | always fails closed in Sprint 1 | |

`/public/*` returns `404 not_found` for unknown or unpublished slugs.

## Key shapes

```jsonc
// Sale
{
  "id": "uuid",
  "member": { "id": "uuid", "name": "Aisyah Rahman", "email": "aisyah@example.com" },
  "location_id": "uuid",
  "currency": "MYR",
  "total_minor": 12000, "paid_minor": 5000, "balance_minor": 7000,
  "payment_status": "partially_paid",         // unpaid | partially_paid | paid
  "fulfilled": false,
  "purchased_at": "2026-10-16T10:00:00Z",
  "line_item": {
    "id": "uuid", "price_id": "uuid", "product_id": "uuid",
    "product_name": "Monthly Unlimited", "price_label": "Monthly",
    "quantity": 1, "unit_amount_minor": 12000, "total_minor": 12000, "currency": "MYR",
    "terms": { "duration_days": 30,
               "benefits": [{ "kind": "gym_access", "name": "Gym access", "usage_limit": null, "location_id": null }] }
  },
  "payments": [{ "id": "uuid", "amount_minor": 5000, "currency": "MYR", "method": "cash", "reference": null, "received_at": "..." }],
  "fulfillment": null                         // or { id, sale_line_item_id, membership_id, membership_period, fulfilled_at }
}

// CheckIn
{
  "id": "uuid",
  "member": { "id": "uuid", "name": "...", "email": "..." },
  "location_id": "uuid",
  "result": "denied",                         // granted | denied
  "denial_reason": "usage_limit_reached",     // no_entitlement | location_not_allowed | usage_limit_reached | null
  "entitlement_id": null,
  "checked_in_at": "..."
}

// MemberDetail = Member + membership (periods oldest first) + current_period + entitlements
// Entitlement: { id, kind, name, starts_at, ends_at, location_id|null, usage_limit|null, used_count, remaining|null, active }
```

## Error codes

| Status | Codes |
| --- | --- |
| 400 | `bad_request`, `organization_required`, `idempotency_key_required` |
| 401 | `unauthenticated`, `invalid_token` |
| 403 | `forbidden`, `organization_mismatch` |
| 404 | `not_found` (also for records of another organization) |
| 409 | `idempotency_key_reused` |
| 422 | `validation_failed` (with `details`), `price_unavailable`, `overpayment`, `sale_not_paid` |
| 500 | `internal_error` |
| 503 | `auth_not_configured`, `auth_unavailable`, `database_unavailable` |

Body references to another organization's member, price, or location return `422 validation_failed` with `details`, for example `{ "member_id": ["was not found"] }`.

## Business rules in short

- A sale has one line, quantity one. The line snapshots product name, price, and terms.
- Payments: cash or bank transfer only. Partial payments are allowed. Overpayment gives `422 overpayment`.
- Fulfill only when `balance_minor` is 0. Fulfillment is idempotent.
- One membership per member per organization. A new period starts at `max(purchased_at, end of latest period)`. Periods never overlap.
- Check-in picks an unlimited right first, then the counted right that ends soonest. Denied attempts consume nothing.

## Shared client

`@hydraflow/api` (`packages/api`) exports generated types and a typed client built on `openapi-fetch`:

```ts
import { createHydraflowClient, type Schemas } from "@hydraflow/api";

const api = createHydraflowClient({
  baseUrl: process.env.HYDRAFLOW_API_URL!,
  organization: "chainsaw",
  token: serverSideToken,           // never sent to the browser
});
const { data, error } = await api.GET("/staff/members");
```

Regenerate types with `bun run --cwd packages/api generate` after editing `openapi.yaml`.

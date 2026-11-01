# Workflows

Business flows through the [Benefit Delivery Cycle](benefit-delivery-cycle.md). Sign-in and staff management flows are in [Identity](identity.md#staff-portal-and-member-area) and [Authorization](authorization.md#staff-management).

## Change a membership offer

1. Create a product and its benefits.
2. Create one or more prices.
3. To change an amount or term, create a new price and archive the old one.

Past sales keep their original prices and terms.

## Purchase and fulfill

1. Select a member, product, and price.
2. Create the sale and line items. Save the purchased terms.
3. Record payments. Partial payment and pay later are allowed.
4. Fulfill after full payment. Staff with permission can fulfill earlier; the sale keeps its balance and the authorization is recorded.
5. Create the membership and first period, or add a period to the existing membership.
6. Create the period's grants and entitlements.

Early delivery sends an `early_reason` and needs `purchases:fulfill_unpaid`. The fulfillment keeps the reason, the actor, and the balance due at that moment. A database check requires a reason whenever a balance was due. The sale keeps its balance and still accepts payments.

If fulfillment fails, keep the payment and retry the same fulfillment. A partial write must never look complete.

Activation is configurable. The default start is the purchase date.

## Renew

1. Select the existing membership.
2. Use the member's agreed price. Never switch to the current catalog price automatically.
3. Create a new sale and payment.
4. Fulfill a new period on the same membership.

Early renewal appends a period after the last one. It does not change the current period or the cycle. Reject overlaps, including from concurrent renewals.

`POST /staff/members/{id}/renewals` copies the line item behind the member's latest delivered period: the same price, amount, and terms. It works after that price is archived. The sale records which line item it renews. Expired renewal follows the same rule: the new period starts when it is delivered.

## Check in

1. Identify the member and location.
2. Find entitlements valid at that time and location.
3. Apply the usage limit.
4. Record the check-in.
5. If access is granted, record usage once. Authorization and consumption are atomic.

Denied access records a reason. A staff override needs a permission and a reason.

An override sends `override_reason` with the check-in and needs `check_ins:override`. When the rights would deny entry, the check-in is granted, keeps its `denial_reason`, records the reason and the actor, and consumes nothing. When a right allows entry, it is used as usual and no reason is recorded. A database check keeps these three shapes apart.

## Refund or revoke

1. Find the payment and the affected purchase.
2. Record the refund.
3. Apply the benefit policy as a separate step.
4. Revoke only the period and rights from that purchase.

A refund can keep benefits. A revocation can happen without a refund. Voids are separate from refunds.

Current implementation limits, chosen where [Decisions](decisions.md#catalog-and-purchase) is still open:

- A refund belongs to one payment. Partial refunds are allowed. The total refunded on a payment cannot exceed it. `paid_minor` stays the total received; `refunded_minor` is separate, so a refund never reopens the balance.
- A refund never changes access. Revoke access as its own action.
- Revoking a sale ends only its period and entitlements, at once. Other periods, payments, and recorded usage stay. A revoked period no longer blocks a new period over the same dates.
- A sale can be voided only before delivery and when it keeps no money. Refund any payments first. A void sale takes no payments and cannot be delivered.
- Refunds, voids, and revocations each record the actor, time, and a required reason. Refunds are immutable in the database.

## Adjust benefits manually

Record the member, right, actor, reason, time, and change. Keep the original grant and usage.

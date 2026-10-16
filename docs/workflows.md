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

If fulfillment fails, keep the payment and retry the same fulfillment. A partial write must never look complete.

Activation is configurable. The default start is the purchase date.

## Renew

1. Select the existing membership.
2. Use the member's agreed price. Never switch to the current catalog price automatically.
3. Create a new sale and payment.
4. Fulfill a new period on the same membership.

Early renewal appends a period after the last one. It does not change the current period or the cycle. Reject overlaps, including from concurrent renewals.

## Check in

1. Identify the member and location.
2. Find entitlements valid at that time and location.
3. Apply the usage limit.
4. Record the check-in.
5. If access is granted, record usage once. Authorization and consumption are atomic.

Denied access records a reason. A staff override needs a permission and a reason.

## Refund or revoke

1. Find the payment and the affected purchase.
2. Record the refund.
3. Apply the benefit policy as a separate step.
4. Revoke only the period and rights from that purchase.

A refund can keep benefits. A revocation can happen without a refund. Voids are separate from refunds.

## Adjust benefits manually

Record the member, right, actor, reason, time, and change. Keep the original grant and usage.

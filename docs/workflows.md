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

Activation is configurable. The default start is the purchase date. Only the default is built. Other modes wait on [#38](https://github.com/kennedywee/flowfokus/issues/38).

## Renew

1. Select the existing membership.
2. Use the member's agreed price. Never switch to the current catalog price automatically.
3. Create a new sale and payment.
4. Fulfill a new period on the same membership.

Early renewal appends a period after the last one. It does not change the current period or the cycle. Reject overlaps, including from concurrent renewals.

`POST /staff/members/{id}/renewals` copies the line item behind the member's latest delivered period: the same price, amount, and terms. It works after that price is archived. The sale records which line item it renews. Expired renewal follows the same rule: the new period starts when it is delivered.

## Mark attendance

Staff mark a booked member as here on the Session details page. This is the only check-in. It needs `bookings:manage`. See [Book](#book).

A walk-in visit with no booking is not recorded. Gym access check-in left the scope on 21 November 2026 ([#81](https://github.com/kennedywee/flowfokus/issues/81)).

## Run a program

1. Add a program: kind, location, spots per time, length, and host. Adding a program or a ticket price uses an Idempotency-Key, so a retry never makes a duplicate.
2. Add times: a date and a start time in the gym's time zone, repeated weekly for up to 26 weeks. Existing times are skipped.
3. Add ticket prices on the program's page. The first price creates its ticket product.
4. To let passes or memberships book it, add a program benefit to the offer.

Cancelling a time cancels every booking and returns each use. Ticket payments stay; refund them from each sale.

## Book

A booking always uses one entitlement.

- **With a pass or membership.** Pick the time and a right that covers it. Rails locks the time, checks the spot, the scope, the location, and the validity, then books and records one use. Members do this on the gym site; staff do it from the roster.
- **With a ticket at the desk.** Record a sale for the time, take payment, and deliver. Delivery checks the spot and books it. A full or cancelled time delivers nothing.
- **With a ticket online.** The member opens a checkout. It holds the spot for 30 minutes. When the provider confirms payment, the sale, payment, delivery, and booking are recorded together.

**Several spots in one purchase.** A ticket sale or online checkout can buy up to ten spots for one time, and names who comes to each. Staff can name members or guests; a member buying online can name only themself and guests. The checkout holds every spot or none, and delivery checks the whole group fits. The buyer holds one right with a use per spot, and each attendee gets a booking. Staff cancel and refund a single spot on its own.

If a member leaves an online payment unfinished, the booking page shows the held spot with "Continue paying" and "Cancel and free the spot".

Members can cancel pass and membership bookings before the start; the use comes back. Ticket bookings are changed by staff. Staff can cancel any live booking and choose whether the use comes back. An attended booking cannot be cancelled.

## Buy online

The gym site sells published passes, memberships, and tickets to linked members. Only the local test provider exists. It is opt-in with `FLOWFOKUS_TEST_PAYMENTS=true`, moves no money, and production refuses to boot with it. A real provider needs a decision, credentials, and a signed webhook that completes the checkout.

## Refund or revoke

1. Find the payment and the affected purchase.
2. Record the refund.
3. Apply the benefit policy as a separate step.
4. Revoke only the period and rights from that purchase.

A refund can keep benefits. A revocation can happen without a refund. Voids are separate from refunds.

Current rules:

- A refund belongs to one payment. Partial refunds are allowed. The total refunded on a payment cannot exceed it. `paid_minor` stays the total received; `refunded_minor` is separate, so a refund never reopens the balance.
- A refund never changes access. Revoke access as its own action.
- Revoking a sale ends only its period and entitlements, at once. Other periods, payments, and recorded usage stay. A revoked period no longer blocks a new period over the same dates. Bookings that used those rights for times that have not started are cancelled.
- A sale can be voided only before delivery and when it keeps no money. Refund any payments first. A void sale takes no payments and cannot be delivered.
- Refunds, voids, and revocations each record the actor, time, and a required reason. Refunds are immutable in the database.

## Adjust benefits manually

Record the member, right, actor, reason, time, and change. Keep the original grant and usage.

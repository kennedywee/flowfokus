# Models

Domain records and their rules. Fields are conceptual, not a migration spec. Identity models (User, Organization, OrganizationMembership, Member) are in [Identity](identity.md).

## Product stage

**Product.** The offer. Has many prices and product benefits. In the first release, every product is a membership.

**Price.** Belongs to one product. Has an amount, currency, availability, and commercial terms.

- Amount, currency, product, and commercial terms are immutable. A change creates a new price.
- A product can have many available prices.
- Availability and labels can change.
- Archive a price to stop new sales. Never delete a price that a sale references.

This follows [Stripe's product and price model](https://docs.stripe.com/products-prices/manage-prices). Stripe is not required.

**ProductBenefit.** A promised benefit, such as gym access for a period. A catalog template, not a usable right.

## Purchase stage

**Sale.** Groups line items and payments. Belongs to an organization. Records the buyer and the sale location.

**SaleLineItem.** Belongs to a sale. References the selected price. Keeps quantity, discounts, taxes, totals, a product name snapshot, and the purchased benefit terms. Does not require a membership. Later catalog edits never change it.

**Payment.** Money received toward a sale: amount, currency, method, external reference. A sale can be partly paid or unpaid.

**Refund.** Money returned against a payment: amount, reason, actor. It never edits the original payment. Refunding money and revoking benefits are separate actions.

## Fulfillment stage

**Fulfillment.** Delivers one line item's purchased terms. Keeps the line item, recipient, delivered records, and outcome. A retry must not duplicate periods or entitlements.

**Membership.** A member's continuing membership. Has many periods. A renewal adds a period; it does not create a new membership. Default: one membership per member per organization.

**MembershipPeriod.** One covered period. Belongs to a membership and keeps its source fulfillment. Periods in a membership never overlap.

**BenefitGrant.** Records why a member received benefits: member, source fulfillment, period (for memberships), benefit origin, and time. Manual grants record the acting user and reason. Has one or more entitlements. A grant is not consumed.

## Entitlement stage

**Entitlement.** A usable right. Belongs to a grant. Has validity, location scope, and a usage limit (counted or unlimited). Access rules live here, not on memberships or grants.

**EntitlementUsage.** One authorization or consumption of an entitlement, linked to a check-in. Unlimited access still records usage. Processing the same access twice must not consume twice.

**CheckIn.** An access attempt by a member at a location: time, method, result. Denied attempts and staff overrides record a reason and do not consume an entitlement.

## Shared rules

**Time boundaries.** Periods and entitlements include the start and exclude the end: `start <= time < end`. Consecutive periods share a boundary instant. Overlap must still be prevented separately.

**Locations.** Three separate facts: where a sale happened (sale), where access happened (check-in), and where access is allowed (entitlement scope).

**History.**

- All linked records belong to the same organization.
- Sales keep their prices and purchased terms.
- Every period and grant traces back to a purchase or an authorized manual action.
- Refunds, revocations, adjustments, and removed staff access never erase history.

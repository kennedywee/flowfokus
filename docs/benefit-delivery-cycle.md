# Benefit Delivery Cycle

Flowfokus's domain has exactly four stages:

**Product → Purchase → Fulfillment → Entitlement**

| Stage | Meaning | Models |
| --- | --- | --- |
| Product | What the business offers. | Product, Price, ProductBenefit |
| Purchase | What the customer bought. | Sale, SaleLineItem, Payment, Refund |
| Fulfillment | How Flowfokus delivers it. | Fulfillment, Membership, MembershipPeriod, BenefitGrant |
| Entitlement | What the member can now use. | Entitlement, EntitlementUsage, CheckIn |

Catalog records grant nothing. A purchase grants nothing until it is fulfilled. Usage belongs to the Entitlement stage; it is not a fifth stage. Future reservations also join the Entitlement stage.

```mermaid
flowchart TD
  Product --> Price
  Product --> ProductBenefit
  Sale --> SaleLineItem
  Sale --> Payment
  Payment --> Refund
  SaleLineItem -->|references| Price
  SaleLineItem --> Fulfillment
  Fulfillment -->|creates or renews| Membership
  Membership --> MembershipPeriod
  MembershipPeriod --> BenefitGrant
  BenefitGrant --> Entitlement
  Entitlement --> EntitlementUsage
  EntitlementUsage --> CheckIn
```

The diagram shows relationships, not a full schema. See [Models](models.md) for details.

## Example: monthly membership

| Stage | Example |
| --- | --- |
| Product | Monthly Membership. Price RM120. Benefit: gym access for one month. |
| Purchase | The member buys it. The line item references the RM120 price. Payment completes. |
| Fulfillment | Create the membership, its October period, and a benefit grant. |
| Entitlement | Gym access valid from 1 October 00:00 until 1 November 00:00. Check-ins record use. |

## Future example: ten-class pass

| Stage | Example |
| --- | --- |
| Product | 10 Class Pass. Benefit: ten class uses. |
| Purchase | Same sale and payment flow. |
| Fulfillment | Create a benefit grant. No membership is needed. |
| Entitlement | Class access with ten uses. Reservations consume them. |

The same cycle supports both. Sales and payments need no membership-specific fields.

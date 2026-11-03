# Programs, tickets, and bookings

Status: agreed in conversation on 3 November 2026. Build in development; old local data may be discarded.

## Intent

Gyms sell more than memberships. They run group classes, events, and appointments. Members must be able to see the schedule, book a spot, and pay on the gym site by themselves. Staff must be able to run the same things at the desk.

The design keeps the four-stage Benefit Delivery Cycle (Product → Purchase → Fulfillment → Entitlement). Nothing new is sold outside it.

## Agreed terms

| Term | Meaning |
| --- | --- |
| **Program** | Something people attend. Kind: `group_class`, `event`, or `appointment`. `course` comes later. Not "listing" and not "activity" (reserved for a future timeline). |
| **Occurrence** | One dated instance of a program, with its own capacity. The UI shows it as a date and time. |
| **Ticket** | A product of kind `ticket`, made from a program's page. It buys entry to one occurrence. Staff never need to see that it is a product. |
| **Pass** | A product of kind `pass`: counted uses across one or more programs, valid for a number of days. |
| **Booking** | One member's spot in one occurrence. It always uses one entitlement. |
| **Ways to book** | Use an entitlement the member already holds (pass or membership), or buy a ticket. These are not payment methods. Payment methods describe how money arrives. |

## Decisions

1. **Product stays.** A ticket is a product with kind `ticket`. Sales, payments, refunds, reports, and fulfillment keep one path. A pass can cover many programs, so it cannot belong to one program.
2. **The benefit scope decides behavior.** A `program_access` benefit covers any program, all programs of one kind, or selected programs. The product kind is a label for staff and for fulfillment shape.
3. **A ticket is bought for one occurrence.** Its entitlement is valid from purchase until the occurrence ends, has one use, and is scoped to that occurrence. Buying it creates the booking.
4. **A booking uses its entitlement at booking time.** Cancelling before the start returns the use. A no-show keeps it used. Attendance is recorded on the booking.
5. **Members book and pay on the gym site.** Online checkout uses a payment provider behind a small interface.
6. **Holds.** An online checkout holds the seat until the checkout expires (30 minutes). Expired holds stop counting at once; no job is needed.
7. **The sale is created when payment succeeds.** An abandoned checkout leaves no unpaid sale behind. The checkout keeps the chosen price and occurrence.
8. **Desk ticket sales** reuse the normal sale, payment, and delivery steps. Delivery checks capacity and creates the booking.

## Calls made by the builder

- **Payment provider.** No card processor exists yet. Build a provider interface with a local **test provider** only. It is opt-in (`FLOWFOKUS_TEST_PAYMENTS=true`), refused in production, and clearly labelled in the site. A real provider (Stripe, or a Malaysian provider such as Billplz) needs a decision and credentials.
- **Online sales** have no staff actor and no sale location. A `channel` column (`desk` or `online`) explains the missing values, and database checks keep the shapes apart.
- **Gym check-in** uses only `gym_access` rights. Program rights never open the gym floor.
- **Member cancellation** works for bookings made with a pass or membership, before the start. Ticket bookings are changed by staff, who can refund separately.
- **Staff cancelling an occurrence** cancels every booking and returns every use.
- **Revoking a sale** also cancels future bookings that used its rights.
- **Times** are entered in the gym's time zone as a date and a start time. A weekly repeat creates up to 26 occurrences.
- **Permissions:** `programs:read`, `programs:manage`, `bookings:create`, `bookings:manage`.

## Model changes

| Record | Change |
| --- | --- |
| `programs` | New. Location, name, description, kind, capacity, duration, host name, published. |
| `occurrences` | New. Program, start, end, capacity, cancellation. |
| `bookings` | New. Member, occurrence, entitlement (empty while a checkout holds the seat), checkout, sale, hold expiry, confirmation, cancellation, attendance. One live booking per member and occurrence. |
| `checkouts` | New. Member, price, occurrence, amount, provider, provider reference, status, expiry, resulting sale. |
| `products` | Kind adds `pass` and `ticket`. Ticket products keep their program. |
| `prices` | Duration is empty for tickets and required otherwise. |
| `product_benefits`, `entitlements` | Kind adds `program_access`, with program scope. Entitlements may be scoped to one occurrence. |
| `sales` | `channel`, optional occurrence. Online sales have no staff actor or location. |
| `payments` | Method adds `online`, with a provider. Online payments have no staff actor. |
| `fulfillments` | Membership is optional. Online delivery has no staff actor. |
| `entitlement_usages` | Linked to a check-in or a booking. A returned use is marked, never deleted. |

## Flows

**Book with a pass or membership:** the member picks an occurrence, then a usable right. Rails locks the occurrence, checks capacity and scope, creates the booking, and records one use.

**Buy a ticket online:** the member picks an occurrence and a ticket price. Rails creates a checkout and a held booking. The site sends the member to the provider. When the provider confirms payment, Rails creates the sale, records the payment, delivers the ticket, and confirms the booking in one transaction.

**Buy a pass or membership online:** the same checkout without an occurrence.

**Desk:** staff sell a ticket for an occurrence, take payment, and deliver. Or they book a member with an existing right. Staff mark attendance and cancel bookings from the roster.

## Out of scope

Waitlists, recurring billing, a real payment provider, courses, cancellation deadlines and fees, staff calendars for appointments, and buying for another person.

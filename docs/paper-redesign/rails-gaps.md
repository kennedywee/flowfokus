# Rails gaps after the portal redesign

The portal now follows Paper wherever the current API allows. This list holds
what Paper shows and the portal left out because Rails does not supply it. It
is the input for step 3. Each set's report in `reports/` has the detail and the
Paper artboards.

Items marked **decision** wait on an open decision in `README.md`.

## Members

- Update a member: name, email, phone, date of birth, emergency contact, note.
- Member numbers (M-0412) everywhere: lists, search, ⌘K, check-in.
- Tags, home location, and "also visits".
- Freeze and cancel a membership, with a reason.
- A "renews" state for membership periods. Today periods only end.
- Comments, notes, pinned items, and the All / Comments / Activity feed filter.
- Visit totals and frequency. Check-ins are capped at the latest 100.
- Bookings: full counts beyond upcoming plus the 10 latest, and a location.
- Access rights linked to the product and sale that gave them.
- Member list: membership summary, last visit, balance due, status filters with
  counts, server paging and total count, bulk actions.
- The duplicate-email error returns the existing member's id ("Open member").
- Email required or optional on New member. **decision 8**

## Sales and payments

- Sale numbers (#1047).
- Who did each action: sold by, payment recorded by, fulfilled, refunded, voided.
  Rails stores the payment actor but the API does not return it.
- Sale notes, invoices and "Send invoice", receipts (print and email),
  payment attachments.
- Card, e-wallet, and online payments. **decision 4**
- Renew at the agreed price from the sale page.
- Several lines in one sale.
- Server-side filters and paging for the sales list.
- "Also end access" on Refund. **decision 7**
- Status words: "Partly paid", "Awaiting payment", "Access ended". **decision 9**

## Check-ins

- The cause behind `no_entitlement`: no access, access ended, sale awaiting
  payment, or paid but not fulfilled. Frames 16 and 17 need it.
- The access right used, credits left, and credits used.
- Undo a check-in.
- Access hours and an "Outside access hours" denial. **decision 6**
- Walk-ins, and a booking counting as access. **decision 6**
- Member search with numbers, phones, and access status.
- The Access filter, Display, and a check-in detail page.

## Schedule, sessions, and programs

- No-show and undo attendance. Bulk check-in and no-show.
- The "Unpaid" chip on a booking (the booking lacks the sale's payment state).
- Row actions: Change payment, Collect payment, Move to another session.
- Session and program activity with comments.
- Emails to booked members when a session is cancelled.
- Several hosts per program and a staff host picker.
- A recurrence rule: several days per week, Until, specific dates, and the
  weekly-pattern subtitle.
- Duplicate and archive a program.
- Pass credits per program.
- The next session per program in the programs list.
- Tickets that cover several sessions, "Who can buy", and "Sell online".
  **decision 5**
- Waiting lists ("Full · 3 waiting").

## Products

- Retry protection when creating a product. A lost reply can create it twice.
- Price creation time, so the page can show the newest price, not the cheapest.
- Holders per product, product activity and comments.
- Archive and restore a whole product.
- Who can buy and member tags; a desk or online channel beyond `published`.
- Locations on the product (today per benefit).
- Pass credits and "valid from first use".
- Sold and Last 30 days counts.

## Home and Reports

- Today: sales, collected, new members, payments by method.
- Total due, the oldest sale's age, names of unfulfilled sales, memberships
  ending this week.
- First-run setup progress.
- Reports: the report list and six report pages, with ranges, location scope,
  and the figures each page needs. The portal keeps the old weekly page until
  these endpoints exist. See `reports/reports.md`.

## Settings and staff

- Logo, editable organization name, contact email, week start, member ID prefix.
- Location open hours and counts, and removing a location.
- Staff last active and staff locations; the day an invitation was sent;
  resend invitation; role descriptions and locations in Invite staff.
- Payments, Booking rules, and Profile screens.
- Coach and the "Front desk" role name (WorkOS and Rails). Deferred by the
  18 Nov 2026 role decision.
- Stable error codes for Team refusals. The portal matches Rails' English
  messages today.

# Members and Sales — Paper redesign report

Pages: "Members" (`p-8-0`), "Member details" (`p-6-0`), "New member" (`p-H-0`),
"Sales" (`p-E-0`), "Sale details" (`p-F-0`), and "New sale" (`p-G-0`) in
"Flowfokus Redesign". The original frames are the target. Every new frame is a
clone of an original frame of the same screen, changed only where the state
needs it. No original frame was moved, renamed, or restyled.

Shared patterns, so the six pages and the Products page agree:

- Loading: the page shell with grey skeleton bars. The breadcrumb stops at the
  section ("Members", "Sales"), because the record is not known yet.
- Load error and not found: one plain line with a small red icon, and one
  action ("Try again", "View all members", "View all sales").
- No permission: one plain line with a small lock icon that names the missing
  permission. The top bar keeps only Search. The user is "Farid · Coach".
- Empty list: one plain line, no icon tile, no button (New member and New sale
  are already in the top bar).
- Confirms follow "Discard changes?" (`TP2-0`): no header band, no close button.
  Form dialogs follow "Sales — Dialogs and menu".

## 1. Coverage

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| **Members list** | Members — list | existed |
| Search with no match | Members — no results | existed |
| Loading | Members — loading | added |
| Did not load | Members — load error | added |
| No members at all | Members — no members yet | added |
| Role without `members:read` | Members — no permission | added |
| Role without `members:create` (no New member) | Members — list, read only | added |
| **Member details** | Member details — Priya Nair | existed |
| Member with no membership, passes, bookings, or sales | New member — 5 · Created (Member details) | existed |
| Sale rows: payment and fulfillment facts, balance due on a row | Sale row — payment & fulfillment states | existed |
| Loading | Member details — loading | added |
| Not found | Member details — not found | added |
| Did not load | Member details — load error | added |
| Gym site sign-in: not linked, menu with Create link code | Member details — Gym site menu, not linked | added |
| Gym site sign-in: link code shown with its expiry | Member details — Gym site link code created | added |
| Gym site sign-in: Unlink confirm (linked value under the dim) | Member details — Unlink sign-in | added |
| ⋯ menu with Renew membership… | Member details — ⋯ menu · Renew | added |
| Renew dialog, and its failure line | Member details — Renew membership · request failed | added |
| Balance due in the header; role without `purchases:create` (no Sell, no ⋯, gym site value not editable) | Member details — read only · balance due | added |
| Role without `members:read` on a member link | Members — no permission (same line) | existed via the list frame |
| Check in from the member page | — | not designed (owned by the Check-ins agent) |
| **New member** | New member — 1 · Empty, 2 · Filled | existed |
| Phone already used | New member — 3 · Phone already used | existed |
| Email already used | New member — 3b · Email already used | added |
| Leave with typed details | New member — 4 · Discard | existed |
| Created, member page with toast | New member — 5 · Created (Member details) | existed |
| Request failed (not a field error) | New member — 6 · Not created (request failed) | added |
| Role without `members:create` | New member — 7 · No permission | added |
| **Sales list** | Sales — list | existed |
| Filter, rows selected, no match | Sales — list · filtering / rows selected / no results | existed |
| Loading | Sales — list · loading | added |
| Did not load | Sales — list · load error | added |
| No sales at all | Sales — list · no sales yet | added |
| Role without `purchases:read` | Sales — no permission | added |
| Role without `purchases:create` (no New sale) | Sales — list · read only | added |
| **Sale details**: unpaid, partly paid, paid, fulfilled, void, refunded, access ended | the ten "Sale details — #10xx" frames | existed |
| Record payment, Refund with payment choice, Void with reason, Sale ⋯ menu | Sales — Dialogs and menu | existed |
| Loading | Sale details — loading | added |
| Not found | Sale details — not found | added |
| Did not load | Sale details — load error | added |
| Fulfill early with a required reason (error shown) | Sales — Dialogs and menu · more states | added |
| End access (revoke) with a reason | Sales — Dialogs and menu · more states | added |
| A dialog request failed | Sales — Dialogs and menu · more states (shown on Void) | added |
| ⋯ menu for a role without refund, void, or end access | Sales — Dialogs and menu · more states | added |
| Role cannot fulfill unpaid (Fulfill hidden, note shown) | Sale details — role cannot fulfill unpaid | added |
| Read-only role (no band actions, no ⋯) | Sale details — read only | added |
| Just created, toast | Sale details — #1061 just created (toast) | existed |
| **New sale**: empty, member search, add products, payment, partly paid, paid | New sale — 1 … 3d | existed |
| Started from a member (member already chosen) | New sale — 3c · Partly paid shows the chosen-member block | existed |
| Errors on fields | New sale — 4a · Error, no member | existed |
| Leave with changes | New sale — 4b · Discard changes? | existed |
| No product has a price to sell | New sale — 1d · No products to sell | added |
| Request failed | New sale — 4c · Not created (request failed) | added |
| Created, but the payment was not recorded | New sale — 5 · Created, payment not recorded (Sale details) | added |
| Can sell, cannot record payments | New sale — 3e · Role cannot record payments | added |
| Role without `purchases:create` | New sale — 7 · No permission | added |
| Products or members did not load | New sale — 8 · Products or members did not load | added |
| Loading | — | not designed: it is the Sale details loading pattern with the New sale tile; no new decision |

## 2. Added

Members (`p-8-0`), second row:
- **Members — loading**: header band and five skeleton rows.
- **Members — load error**: "Members did not load. Check the connection, then try again." and Try again.
- **Members — no members yet**: "No members yet". New member stays in the top bar.
- **Members — no permission**: lock line naming `members:read`. Farid · Coach.
- **Members — list, read only**: the list without New member and ⋯.

Member details (`p-6-0`), right of the originals:
- **Gym site link code created**: a "Gym site" property under Contact ("Not linked"), then the code `4F7K-92QD`, "works once, until 19 Nov".
- **Gym site menu, not linked**: the value pressed, a one-item menu "Create link code" below it, in the Sale ⋯ menu style.
- **Unlink sign-in**: value "Linked · priya.nair@gmail.com" under the dim; confirm in the `TP2-0` style.
- **⋯ menu · Renew**: menu under ⋯ with "Renew membership…" and "Cancel membership…" (the latter opens the existing Cancel membership frame).
- **Renew membership · request failed**: confirm "Renew Priya Nair for RM 200.00?" with the agreed price, the start date, the location, and the failure line. The normal state is the same dialog without that line.
- **read only · balance due**: no Sell, no ⋯; header says "RM 100.00 due" in warning colour; sale #1047 is Partial with "RM 100.00 due", and the activity line agrees.
- **loading**, **not found**, **load error**.

New member (`p-H-0`), second row:
- **3b · Email already used**: the phone frame with the error moved to Email.
- **6 · Not created (request failed)**: one failure line above Profile; fields keep their values.
- **7 · No permission**: title tile and a lock line naming `members:create`.

Sales (`p-E-0`), third row: **loading**, **load error**, **no sales yet**, **no permission**, **read only** — the same patterns as Members.

Sale details (`p-F-0`), right of the originals:
- **Sales — Dialogs and menu · more states**: Fulfill early (reason empty, field error), End access (reason), Void with the failure line, and the ⋯ menu without Refund, End access, and Void.
- **loading**, **not found**, **load error**.
- **role cannot fulfill unpaid**: #1061 without "Fulfill items" and with "Fulfillment opens when the sale is paid in full. RM 530.00 is still due." User "Aina · Front desk".
- **read only**: #1061 without band actions or ⋯. Farid · Coach.

New sale (`p-G-0`), second row:
- **5 · Created, payment not recorded**: the Sale details page after create (Unpaid, no payments, RM 530.00 due) with an error toast "Sale #1061 created. The RM 300.00 cash payment was not recorded." and Record payment.
- **1d · No products to sell**: "No membership or pass has a price to sell. Open Products".
- **8 · Products or members did not load**, **7 · No permission**, **4c · Not created**, **3e · Role cannot record payments** (no Record payment in the Payment band; user Aina · Front desk).

## 3. Conflicts

- **Refund ends access in the same dialog.** "Sales — Dialogs and menu" has "Also end access to Monthly unlimited" inside Refund. Rails keeps refund and revoke apart and needs a revoke reason. The app says "Access stays; revoke it separately". Either Rails accepts both in one request with a reason, or Paper drops the checkbox.
- **Fulfill without a reason when money is due.** The exploration "Fulfill items dialog" notes "reason removed". Rails requires `early_reason` when the balance is above zero. My Fulfill early dialog keeps the reason.
- **"Refunded" as a payment status** with a struck-out total in the Sales list. Rails payment facts are Paid, Part paid, Unpaid, and Void; refunded money is a separate amount. Paper's "Partial" and "Awaiting payment" also differ from the app's "Part paid" and "Unpaid". One set of words is needed.
- **Email is "Optional"** on New member, but Rails requires an email. The duplicate-email frame keeps Paper's label.
- **Sales — list · no results** shows "1–50 of 1,284 sales" under an empty list; the footer should hide or say 0.

## 4. Needs app or Rails work

- Everything that `apps/portal/DESIGN.md` already lists as "Not shown, because Rails has no data for them" (numbers, phone, tags, notes, comments, card and e-wallet, quantity, custom items, several lines, invoices, receipts, Book).
- **Sell shows for every role.** `MemberDetails.tsx` renders Sell without checking `purchases:create`; Paper hides it.
- **Cancel membership** (`14DP-0`) and its ⋯ item have no Rails action; the app only revokes access per sale.
- **Error copy** from `failureMessage` names Rails ("Check that Rails is running") and permission codes alone ("Your role does not allow this action"). Use the staff-facing lines in these frames.
- **No-permission pages**: the lists show a generic failure today; Paper shows a page that names the permission.
- **Renew from the member ⋯ menu** keeps the agreed price; Paper's Sale ⋯ menu also has "Renew at agreed price". Decide whether both stay.

## 5. Open questions

- Keep the Refund "also end access" checkbox, or keep End access separate as the app does?
- Which payment and fulfillment words win: Paper's "Partial / Awaiting payment / Refunded / Access ended" or the app's "Part paid / Unpaid / Access revoked"?
- Is email optional for a new member (Paper) or required (Rails)?
- Should the member ⋯ menu hold both Renew and Cancel membership?
- Sales "no results" uses an icon tile; my new empty states use none, per the brief. Should the original drop its tile?

## 6. Not verified

- I did not open the running app; states come from reading the code.
- The sidebar user in permission frames ("Farid · Coach", "Aina · Front desk") is sample data; the real role names are not checked.
- The link-code format `4F7K-92QD` and its expiry length are sample values.
- New sale loading has no frame (see the table).

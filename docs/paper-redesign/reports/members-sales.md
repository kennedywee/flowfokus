# Members and Sales — Paper redesign report

Pages: "Members" (`p-8-0`), "Member details" (`p-6-0`), "New member" (`p-H-0`),
"Sales" (`p-E-0`), "Sale details" (`p-F-0`), and "New sale" (`p-G-0`) in
"Flowfokus Redesign". The original frames are the target. Every new frame is a
clone of an original frame of the same screen, changed only where the state
needs it. No original frame was moved, renamed, or restyled.

Count: 37 new frames and one dialog sheet ("Sales — Dialogs and menu · more
states"). The first pass added 33 frames and the sheet; the review fix pass
added 4 frames (New sale — Loading, Sale details — no permission, Member
details — sign-in unlinked, Member details — membership renewed).

Shared patterns, so the six pages and the Products page agree:

- Loading: the page shell with grey skeleton bars, inside the content column.
  The breadcrumb stops at the section, because the record is not known yet.
- Load error: one plain line with a small red icon and "Try again", on every
  page. Not found: one line and "View all members" or "View all sales".
- No permission: one plain line with a small lock icon, in staff words: "Your
  role cannot view members. Ask an owner for access." The top bar keeps only
  Search. The user is "Farid · Coach".
- Empty list: one plain line, no icon tile, no button (New member and New sale
  are already in the top bar). Lists keep their column header band in loading,
  load error, and empty states.
- Read only: no change control anywhere (no Check in, Sell, Book, ⋯, Tags +,
  Notes +, note pencil, or comment box). Farid · Coach.
- Confirms follow "Discard changes?" (`TP2-0`). Form dialogs follow "Sales —
  Dialogs and menu".
- Sample staff, one permission set each: Kennedy · Owner (everything); Aina ·
  Front desk (sells and records payments, cannot fulfill unpaid); Daniel ·
  Trainer (sells, cannot record payments); Farid · Coach (reads only, or not
  even that where the frame says "no permission").

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
| Cancel membership dialog | Member details — Cancel membership | existed |
| Loading | Member details — loading | added |
| Not found | Member details — not found | added |
| Did not load | Member details — load error | added |
| Role without `members:read` on a member link | Members — no permission (same line) | existed via the list frame |
| Gym site: not linked, menu with Create link code | Member details — Gym site menu, not linked | added |
| Gym site: link code created (result, code and expiry inline) | Member details — Gym site link code created | added |
| Gym site: Unlink confirm | Member details — Unlink sign-in | added |
| Gym site: sign-in unlinked (result with toast) | Member details — sign-in unlinked (toast) | added |
| ⋯ menu with Renew membership… | Member details — ⋯ menu · Renew | added |
| Renew dialog with its failure line | Member details — Renew membership · request failed | added |
| Membership renewed (result with toast) | Member details — membership renewed (toast) | added |
| Balance due in the header; read-only role | Member details — read only · balance due | added |
| Check in from the member page | — | not designed (owned by the Check-ins agent) |
| **New member** | New member — 1 · Empty, 2 · Filled | existed |
| Phone already used | New member — 3 · Phone already used | existed |
| Email already used | New member — 3b · Email already used | added |
| Leave with typed details | New member — 4 · Discard | existed |
| Created, member page with toast | New member — 5 · Created (Member details) | existed |
| Request failed | New member — 6 · Not created (request failed) | added |
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
| Just created, toast | Sale details — #1061 just created (toast) | existed |
| Loading | Sale details — loading | added |
| Not found | Sale details — not found | added |
| Did not load | Sale details — load error | added |
| Role without `purchases:read` on a sale link | Sale details — no permission | added |
| Fulfill early with a required reason (error shown) | Sales — Dialogs and menu · more states | added |
| End access (revoke) with a reason | Sales — Dialogs and menu · more states | added |
| A dialog request failed | Sales — Dialogs and menu · more states (shown on Void) | added |
| ⋯ menu for a role without refund, void, or end access | Sales — Dialogs and menu · more states | added |
| Role cannot fulfill unpaid | Sale details — role cannot fulfill unpaid | added |
| Read-only role | Sale details — read only | added |
| **New sale**: empty, member search, add products, payment, partly paid, paid | New sale — 1 … 3d | existed |
| Started from a member (member already chosen) | New sale — 3c · Partly paid shows the chosen-member block | existed |
| Errors on fields | New sale — 4a · Error, no member | existed |
| Leave with changes | New sale — 4b · Discard changes? | existed |
| Loading | New sale — Loading | added |
| No product has a price to sell | New sale — 1d · No products to sell | added |
| Request failed | New sale — 4c · Not created (request failed) | added |
| Created, but the payment was not recorded | New sale — 5 · Created, payment not recorded (Sale details) | added |
| Can sell, cannot record payments | New sale — 3e · Role cannot record payments | added |
| Role without `purchases:create` | New sale — 7 · No permission | added |
| Products or members did not load | New sale — 8 · Products or members did not load | added |

## 2. Added

Members (`p-8-0`), second row:
- **Members — loading**: header band and five skeleton rows.
- **Members — load error**: header band, "Members did not load. Check the connection, then try again." and Try again.
- **Members — no members yet**: header band and "No members yet".
- **Members — no permission**: "Your role cannot view members. Ask an owner for access."
- **Members — list, read only**: the list without New member and ⋯.

Member details (`p-6-0`):
- **Gym site link code created**: a "Gym site" property under Contact, then the code `4F7K-92QD` and "It works once, until 19 Nov". This is the result frame; the app shows the code inline, with no toast.
- **Gym site menu, not linked**: the value pressed and a one-item menu "Create link code".
- **Unlink sign-in**: the value "Linked · priya.nair@…" on one line, truncated; the confirm in the `TP2-0` style.
- **sign-in unlinked (toast)**: the value back to "Not linked" and the toast "Sign-in unlinked. The member record and its history stay."
- **⋯ menu · Renew**: "Renew membership…" and "Cancel membership…".
- **Renew membership · request failed**: the agreed price, the start date, the location, and "The renewal was not recorded. Nothing was sold. Try again." The normal state is the same dialog without that line.
- **membership renewed (toast)**: new sale #1062 "Monthly unlimited · Renewal", Unpaid and Unfulfilled, RM 200.00 due, at the top of Sales ("Recent 5 of 12"); header "RM 200.00 due"; a new activity line; toast "Renewal recorded. Record payment, then fulfill to start the new period." with View sale. The membership list is unchanged, because the period starts only on fulfillment.
- **read only · balance due**: no change controls; header "RM 100.00 due"; sale #1047 is Partial with RM 100.00 due; Total spent RM 1,900.00; the activity line agrees.
- **loading**, **not found**, **load error**.

New member (`p-H-0`): **3b · Email already used**, **6 · Not created (request failed)**, **7 · No permission**.

Sales (`p-E-0`): **loading**, **load error**, **no sales yet**, **no permission**, **read only**.

Sale details (`p-F-0`):
- **Sales — Dialogs and menu · more states**: Fulfill early is a clone of the original "Fulfill items" dialog (title, fact "#1058 · Hafiz Rahman", the item row, "Fulfill early ⌘↵"), plus "RM 100.00 stays due…" and a required Reason row with its error. Also End access, Void with the failure line, and the ⋯ menu without Refund, End access, and Void.
- **loading**, **not found**, **load error**, **no permission**.
- **role cannot fulfill unpaid** (Aina · Front desk): no "Fulfill items", with "Fulfillment opens when the sale is paid in full. RM 530.00 is still due."
- **read only** (Farid · Coach): no band actions, no ⋯, no note pencil, no comment box.

New sale (`p-G-0`):
- **Loading**: the real tile and title "New sale", two section skeletons, and a side column with two field skeletons. No Create sale button while it loads.
- **5 · Created, payment not recorded**: the sale page after create with an error toast and Record payment.
- **1d · No products to sell**: the original empty box keeps "+ Custom item"; "+ Product" becomes "No membership or pass has a price. Open Products".
- **8 · Products or members did not load** (with Try again), **7 · No permission**, **4c · Not created**, **3e · Role cannot record payments** (Daniel · Trainer).

## 3. Conflicts

- **Fulfill without a reason when money is due.** "Exploration — Fulfill items dialog" (`RUR-0`) A and B fulfill #1061 with RM 530.00 due and note "reason removed". Rails requires an early reason when money is due, and the brief requires "Fulfill early". It is an exploration frame; do not build it as drawn. My Fulfill early dialog keeps the reason.
- **Email "Optional" on New member.** Rails requires an email and checks that it is unique. The duplicate-email check and the gym site link both depend on it. Making email optional would change Rails.

## 4. Needs app or Rails work

- Everything `apps/portal/DESIGN.md` already lists under "Not shown, because Rails has no data for them".
- **Sell shows for every role.** `MemberDetails.tsx` renders Sell without checking `purchases:create`. Paper hides it.
- **Cancel membership** (`14DP-0`) and its ⋯ item have no Rails action; the app only revokes access per sale.
- **Error copy.** `failureMessage` mentions Rails ("Check that Rails is running") and gives a bare "Your role does not allow this action". Use the staff lines in these frames.
- **No-permission pages.** The lists show a generic failure today. Build notes: Members needs `members:read`, New member `members:create`, Sales and sale links `purchases:read`, New sale `purchases:create`, Record payment `payments:create`, Fulfill unpaid `purchases:fulfill_unpaid`, the gym site menu `members:link`.
- **"Open Products"** on New sale shows only to roles with `products:update`, as in the app.
- **Duplicate email.** Paper says "Already used by Mei Ling Tan · Open member". Rails only says the email is already used by another member; it returns no name or link.
- **Renew result.** The app opens the new sale with a "Renewal recorded" toast. Paper stays on the member page with a toast and View sale (as in `DNR-0`). Build Paper's version.
- **Gym site failures.** The app shows error toasts when no code is created or the unlink fails. They follow the toast pattern (`TWC-0`) with a red icon; no separate frame.

## 5. Open questions

- **Refund "Also end access".** The Refund dialog in "Sales — Dialogs and menu" ends access in the same step. Rails keeps refund and revoke apart; revoke needs `memberships:revoke` and its own reason. It can be built as two requests (refund, then revoke), but they can half succeed, and the checkbox must be hidden from roles that cannot end access. Keep it, or keep End access separate?
- **Status words.** The originals already disagree with each other: "Partial" (Member details) against "Partly paid" (Sales, Sale details); also "Awaiting payment", "Refunded", and "Access ended" against the app's "Unpaid" and "Access revoked". Each new frame uses its own original's words. Pick one set.
- Should the member ⋯ menu hold both Renew and Cancel membership?
- Sales "no results" (`UQH-0`) uses an icon tile; the new empty states use none, per the brief. Should the original drop its tile?

## 6. Not verified

- I did not open the running app; states come from reading the code.
- Sample staff names and role names are sample data.
- The link-code format `4F7K-92QD` and its expiry length are sample values.

## 7. Review fixes

1. Must fix — Sale details read only kept the note pencil and comment box: **fixed**, both removed.
2. Fulfill early drawn as a confirm: **fixed**, rebuilt as a clone of "Fulfill items" with fact, item row, ⌘↵, due line, and required Reason.
3. Aina had two permission sets: **fixed**, "Role cannot record payments" is now Daniel · Trainer.
4. Member read-only frame: **fixed**, Total spent is RM 1,900.00, and Check in, Book, Tags +, Notes +, and the comment box are removed, so it is truly read only.
5. Linked value wrapped: **fixed**, one line with an ellipsis.
6. New sale 1d dropped "+ Custom item": **fixed**, the original box keeps it; the `products:update` rule is in section 4.
7. Permission codes in no-permission lines: **fixed**, staff words on all four frames; codes moved to section 4.
8. New sale load error had no Try again: **fixed**.
9. Members load error and empty frames dropped the header band: **fixed**, band added to both.
10. Note — Gym site menu width: not changed; it does not cover its own row.
11. Note — loading skeletons ran under the properties column: **fixed**, both now stop at the content column.
12. Note — Filter, search, and Display stay active in empty states: not changed; the original "no results" frames keep them active too.
13. Note — state lines at different heights: not changed; each follows its cloned original's spacing.
14. Note — gym site result and failure: **fixed**, result frame added; failures noted in section 4.
15. Note — renew result: **fixed**, result frame added and the app difference noted in section 4.
16. Note — duplicate email names the member: noted in section 4.
17. Note — Sale details no permission: **fixed**, frame added.
18. Note — stale line about `UQH-0`'s footer: **fixed**, removed.

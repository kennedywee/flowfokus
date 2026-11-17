# Products — Paper redesign report

Page: "Products" (`p-I-0`) in "Flowfokus Redesign". Naming is settled:
"Products" and "product". The original frames are the target design. The
new state frames extend them. A separate "Option B" block shows the Rails
product model for comparison only.

## The product model question

Paper and Rails model a product differently. This is the one decision the
rest depends on.

| | Paper (original frames) | Rails (today) |
| --- | --- | --- |
| Price | One price per product | Several prices, each with a label, amount, and term in days |
| Changing a price | Edit the price; holders keep the old price until renewal | A price used by a sale cannot change. Add a new price and archive the old one |
| Terms | Length (membership), credits and "valid for" (pass), access hours | Each benefit: kind (gym access or program bookings), usage limit or unlimited, one location or all, program scope (chosen programs, a program kind, or every program) |
| Who can buy | Anyone or members with a tag | Not modelled |
| Channel | Sold online, at the desk, or both | Published (on the gym site) or staff only |
| Locations | One setting on the product | Per benefit |
| Note | Free-text note on the product | Description |
| Holders | List of active holders on the product page | Not exposed per product |
| Activity | Feed with events and comments | Not exposed per product |
| Archive | Archive the whole product | Archive one price |

What each choice costs:

- **Follow Paper.** Rails adds: access hours, "who can buy" with member tags,
  a desk/online channel, a product note, an active-holders query per
  product, a product activity feed with comments, and product archiving.
  The one-price model must still keep sold prices immutable (see
  Conflicts). "Edit price" then has to create a new price behind the scenes
  and keep old sales on the old one. "Credits" and "valid from first use"
  need new pass rules; today a pass runs from fulfillment and counts
  bookings or visits.
- **Follow Rails.** Paper adds: a price list per product (several prices,
  "On sale", "Not on sale", "Archived"), Add price and Archive price
  dialogs, a benefits section, and benefit fields in the form. Paper drops
  access hours, "who can buy", channel, holders, and activity, or keeps them
  as later work. The Option B frames show this.

Recommendation: keep Paper's simple surface (one main price, one set of
terms, a product page with holders and activity), but build it on Rails'
immutable prices, so "change price" adds a new price and archives the old
one. Staff see one price; the record of past prices stays safe.

## 1. Coverage

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Products list | Products — list | existed |
| List, loading | Products — loading | added |
| List, load error | Products — load error | added |
| List, role without `products:create` (no New product) | Products — list, read only | added |
| Role without `products:read` | Products — no permission | added |
| No products, can create | Products — No products | existed |
| No products, read-only role | Products — No products, read only | added |
| Product details (membership) | Product details — Monthly unlimited | existed |
| Pass details | Pass details — 10-class pass | existed |
| Details, role without `products:update` (no Edit, no ⋯, no note edit) | Product details — read only | added |
| Product that cannot be sold | Pass details — archived, cannot be sold | added |
| Toast after a product is created | Product details — just created (toast) | added |
| Toast after a product is saved | Product details — saved (toast) | added |
| New product, membership / pass | New product — 1 · Membership, 2 · Pass | existed |
| Missing price error | New product — 3 · Missing price | existed |
| Saving | New product — 4 · Saving | added |
| Server error on create | New product — 5 · Server error | added |
| Name and length errors | New product — 6 · Name and length errors | added |
| Credits and program errors (pass) | New product — 7 · Pass errors | added |
| Edit product | Edit product — price changed | existed (see Conflicts) |
| Server error on save | Edit product — server error | added |
| Archive product confirm | Product details — Archive | existed |
| Several prices, add price, archive price, benefits | Option B frames | added as the alternative |
| Ticket products | — | not designed. Tickets live on the program page; Rails leaves them out of the products list |
| Saving state for Edit | — | not designed; same as "4 · Saving" with "Saving…" |

## 2. Added

States of the original design (rows at y = 2400, 3600, 4800). Each is a
clone of the original frame with only the state changed.

- **Products — loading.** Original header, toolbar, and columns; four
  skeleton rows on the same column lanes.
- **Products — load error.** Original header and toolbar; one line, "Products
  did not load. The server did not answer.", and Try again.
- **Products — list, read only.** The original list without New product.
  User "Aina · Front desk".
- **Products — no permission.** No toolbar or list; a lock tile and "Your role
  cannot view products. It needs the products:read permission." User "Farid
  · Coach".
- **Products — No products, read only.** The original empty state without New
  product; "No products yet. A manager adds them."
- **Product details — read only.** Monthly unlimited without Edit, the ⋯
  menu, and the note pencil. Sell stays, because selling is a sales
  permission.
- **Product details — just created (toast).** "Off-peak" with 0 holders ("No
  holders yet."), one activity event, and the toast "Off-peak created · On
  sale at RM 150.00" in the Sale details toast style.
- **Product details — saved (toast).** Monthly unlimited with the toast
  "Product saved · New sales use the changes. Holders keep their terms until
  renewal."
- **Pass details — archived, cannot be sold.** The original pass page with an
  "Archived" pill (the list's pill), no Sell, "Sold: Not sold", an "Archived"
  event, and one bordered notice: "Archived 12 Nov by Kennedy. Staff cannot
  sell it, and it is off the online shop. 31 holders keep their credits until
  their pass ends."
- **New product — 4 · Saving.** Create product shows "Creating…" and is dimmed.
- **New product — 5 · Server error.** A bordered notice under the title: "The
  product was not created. The server did not answer. Your details are still
  here; create again."
- **New product — 6 · Name and length errors.** "Enter a name" and "Enter 1
  to 3660 days", in the style of "3 · Missing price".
- **New product — 7 · Pass errors.** Credits "Enter a whole number above 0";
  Books "Pick at least one program".
- **Edit product — server error.** The edit form with a notice "Changes were
  not saved." This frame changes access hours, not the price, so it does not
  repeat the price conflict.

Option B (block at y = 7600 and 8800, 480px below the last state row). Each
name starts with "Option B · ". They use the same window, top bar (Search,
Sell, actions), bands, rows, and dialog style as the originals, so the two
models compare fairly. The Option B list now has the original's Filter,
search, and Display toolbar.

- Option B · Products — list
- Option B · Product details — prices and benefits
- Option B · Product details — price menu
- Option B · Add price — filled
- Option B · Add price — errors
- Option B · Archive price — confirm
- Option B · Product details — price archived
- Option B · Pass details — prices and benefits
- Option B · Pass details — added, no prices
- Option B · New product — membership with benefits
- Option B · New product — pass, selected programs

I removed my earlier Rails-data state frames (loading, load error, no
permission, read only, not for sale, form errors, edit server error); they
are rebuilt above on the original design.

## 3. Conflicts

- **Edit product — price changed.** It edits the price of a product that
  142 members hold (RM 220 → 240). Business rule (`docs/models.md`, Price):
  "Amount, currency, product, and commercial terms are immutable. A change
  creates a new price." A price that a sale used can never change. The frame
  can stay as the staff view only if saving creates a new price and keeps
  the old one for past sales; the helper text "142 holders keep RM 220.00
  until renewal" already matches that outcome.
- **Product details — Monthly unlimited (activity).** "Kennedy changed the
  price from RM 200.00 to RM 220.00" has the same issue: under the rule it is
  "added a new price RM 220.00 and archived RM 200.00".
- **Pass details — 10-class pass (activity).** "Kennedy changed validity from
  45 to 60 days" changes a pass's commercial terms. Past sales must keep 45
  days. Same rule.

## 4. Needs app or Rails work

The build list for the original design:

- One product page per product (`/products/:id`) with holders and activity;
  today all products sit on one page with dialogs.
- New and Edit product as full pages; today they are dialogs.
- One visible price per product, with "change price" creating a new price
  and archiving the old one (see Conflicts).
- Length in days for memberships (exists as the price term).
- Pass "credits" and "valid for … from first use". Today a pass counts
  bookings or visits per benefit and runs from fulfillment.
- Pass "Books" as a list of programs (exists as benefit program scope).
- Access hours per product.
- "Who can buy": anyone or members with a tag; member tags.
- "Sold": online, at the desk, or both; today only published or staff only.
- Locations on the product; today per benefit.
- Product note, editable from the page.
- Active holders per product, with "View all".
- Product activity feed with comments and events.
- Archive and restore a whole product.
- Sell (S) and Edit (E) shortcuts on the product page; New product ⌘↵.
- List columns "Sold" and "Last 30 days" (sales count), plus Filter,
  search, and Display.
- "Try again" on the load error.

## 5. Open questions

- **The product model** (above): follow Paper, Rails, or the recommended mix?
- **Tickets.** Tickets are made and priced on the program page, and Rails
  leaves them out of the products list. Should Products list them at all
  (read-only, linking to the program)? I designed no ticket frame here.
- **Archive vs. not sold.** Paper has both "Archived" and "Sold: Not sold"
  (in the list). Are these the same state, or can a product be live but
  hidden from both channels?

## 6. Not verified

- I did not open the running app. States come from the code.
- The exact Rails `validation_failed` messages; the frames use short
  messages in the style of "Enter a price".
- The ⋯ menu contents on the product page are not drawn in Paper; I assumed
  they are edit actions, so the read-only frame removes it.
- Phone layouts for the new frames.
- "Booking rules & settings" (`p-C-0`) was not edited and not reviewed in detail.

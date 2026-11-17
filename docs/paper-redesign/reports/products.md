# Products — Paper redesign report

Page: "Products" (`p-I-0`) in "Flowfokus Redesign". Naming is settled:
"Products" and "product". The original frames are the target design. The
state frames extend them. A separate "Option B" block shows the Rails product
model for comparison only.

## The product model question

Paper and Rails model a product differently. This is the one decision the
rest depends on.

| | Paper (original frames) | Rails (today) |
| --- | --- | --- |
| Price | One price per product | Several prices, each with a label, amount, and term in days |
| Changing a price or length | Edit it; the frames say holders keep the old price "until renewal" | A price a sale used cannot change. A new amount **or a new length** means a new price; the old one is archived |
| Renewal | Implied: holders move to the new price at renewal | A renewal copies the member's last sale, with its price and terms, every time (`Sale.renew!` → `SaleLineItem#renewal_snapshot`). Members keep the old price for good, even if it is archived |
| Terms | Length (membership), credits and "valid for" (pass), access hours | Each benefit: kind (gym access or program bookings), usage limit or unlimited, one location or all, program scope |
| Editing what a product gives | Edit terms on the product | Safe today: benefits are copied into each sale, so edits affect new sales only |
| Who can buy | Anyone or members with a tag | Not modelled |
| Channel | Sold online, at the desk, or both; "Not sold" | Published (gym site) or staff only; a price on sale or not on sale |
| Locations | One setting on the product | Per benefit |
| Note | Free-text note | Description |
| Holders, activity | On the product page | Not exposed per product |
| Archive | The whole product | One price at a time |

What each choice costs:

- **Follow Paper.** Rails adds access hours, "who can buy" and member tags, a
  desk/online channel, a product note, holders per product, a product
  activity feed with comments, and product archive and restore. "Edit price"
  or "edit length" must add a new price and archive the old one, because
  sold prices stay fixed. "Credits" and "valid from first use" need new pass
  rules; today a pass counts bookings or visits and runs from fulfillment.
- **Follow Rails.** Paper adds a price list per product (on sale, not on
  sale, archived), Add price and Archive price, a benefits section, and
  benefit fields in the form. Access hours, "who can buy", channel, holders,
  and activity become later work. The Option B frames show this.

Recommendation: keep Paper's simple surface (one main price, one set of
terms, holders and activity), built on Rails' fixed prices, so changing the
price or the length adds a new price and archives the old one. Benefits can
stay editable in place, because each sale keeps its own copy.

Still unanswered, for the user:

- Renewals: see the first open question.
- Selling two prices at once (monthly and yearly, a founding rate). Paper's
  answer seems to be separate products ("Annual unlimited"); Rails allows
  several prices on one product.
- What "Not sold" means in Rails: no price on sale, staff only, or an
  archived product.
- Where benefits are edited. Paper's membership form never says what the
  membership gives (gym access, which programs, which locations).
- What archiving and restoring a product does to its prices.

## 1. Coverage

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Products list | Products — list | existed |
| List, loading | Products — loading | added |
| List, load error | Products — load error | added |
| List, role without `products:create` | Products — list, read only | added (no New product, no ⋯) |
| Role without `products:read` | Products — no permission | added |
| No products, can create | Products — No products | existed |
| No products, read-only role | Products — No products, read only | added (no New product, no ⋯) |
| Product details | Product details — Monthly unlimited | existed |
| Pass details | Pass details — 10-class pass | existed |
| Role without `products:update` | Product details — read only | added (no Edit, no ⋯, no note edit) |
| Product that cannot be sold | Pass details — archived, cannot be sold | added |
| Toast after create | Product details — just created (toast) | added |
| Toast after save | Product details — saved (toast) | added |
| New product | New product — 1 · Membership, 2 · Pass | existed |
| Missing price | New product — 3 · Missing price | existed |
| Saving | New product — 4 · Saving | added |
| Server error on create | New product — 5 · Server error | added |
| Name and length errors | New product — 6 · Name and length errors | added |
| Credits and program errors | New product — 7 · Pass errors | added |
| Can manage products, cannot read programs | New product — 8 · Cannot see programs | added |
| Edit product | Edit product — price changed | existed (see Conflicts) |
| Server error on save | Edit product — server error | added |
| Archive product | Product details — Archive | existed |
| Price list, add, archive (Rails model only) | Option B · Product details — prices and benefits, price menu, Add price — filled / errors, Archive price — confirm, price archived | added in Option B |
| Put a price back on sale (Rails model only) | Option B · Product details — put price on sale | added in Option B |
| Price action failed (Rails model only) | Option B · Product details — price action failed | added in Option B |
| Add price: server error and success (Rails model only) | Option B · Add price — server error; Option B · Product details — price added | added in Option B |
| Benefit field errors (Rails model only) | Option B · New product — benefit errors | added in Option B |
| No `programs:read` with benefits (Rails model only) | Option B · New product — cannot see programs | added in Option B |
| Edit product (Rails model) | Option B · Edit product | added in Option B |
| Ticket products | — | not designed. Tickets live on the program page; Rails leaves them out of the products list |
| Edit saving state | — | not designed; same as "4 · Saving" with "Saving…" |

## 2. Added

States of the original design (rows at y = 2400, 3600, 4800). Each is a clone
of the original frame with only the state changed.

- **Products — loading / load error / list, read only / no permission / No
  products, read only.** Original header, toolbar, columns, and words. Read-only
  frames have no New product and no ⋯. Error and permission lines tell staff
  what to do.
- **Product details — read only.** No Edit, no ⋯, no note pencil. Sell stays
  (a sales permission).
- **Product details — just created (toast).** "Off-peak", "No holders yet.",
  one "created" event, toast "Off-peak created · On sale at RM 150.00".
- **Product details — saved (toast).** The new access hours in Details, a
  "changed access hours" event, toast "Product saved · New sales use these
  terms."
- **Pass details — archived, cannot be sold.** "Archived" once, as the pill
  the list uses, plus the "archived" event. No Sell; no Sold row.
- **New product — 4 · Saving, 5 · Server error, 6 · Name and length errors,
  7 · Pass errors, 8 · Cannot see programs.** Server errors sit as a plain
  line with an icon between the page head and the first band, so the head
  stays as in the original.
- **Edit product — server error.** Same placement; changes access hours, not
  the price.

Option B (block from y = 7600; the state rows end at y = 5920). Each name
starts with "Option B · ". Same window, top bar (Search, Sell, actions),
toolbar, bands, rows, and dialog style as the originals. Words: "Not on sale",
"created", "Changes apply to new sales". Frames: Products — list; Product
details — prices and benefits, price menu, put price on sale, price action
failed, price added, price archived; Add price — filled, errors, server error;
Archive price — confirm; Pass details — prices and benefits, added no prices;
New product — membership with benefits, pass selected programs, benefit
errors, cannot see programs; Edit product.

## 3. Conflicts

Business rule (`docs/models.md`, Price): "Amount, currency, product, and
commercial terms are immutable. A change creates a new price." A database
trigger enforces it.

1. **Edit product — price changed.** It edits the price RM 220 → 240 in
   place. A price a sale used never changes; saving must add a new price.
2. **Product details — Monthly unlimited (activity).** "Changed the price
   from RM 200.00 to RM 220.00" is, under the rule, "added RM 220.00 and
   archived RM 200.00".
3. **Pass details — 10-class pass (activity).** "Changed validity from 45 to
   60 days" changes a pass's term. Past sales keep 45 days.
4. **Renewal promise.** "Edit product — price changed" ("142 holders keep RM
   220.00 until renewal") and the note on "Product details — Monthly
   unlimited" ("Existing members keep RM 220 until renewal") promise a price
   change at renewal. Rails keeps the old price at every renewal: `Sale.renew!`
   copies the member's last line item, price and terms included, even after
   that price is archived. I did not change these original frames.

## 4. Needs app or Rails work

The build list for the original design:

- One product page per product with holders and activity; New and Edit
  product as full pages.
- One visible price per product; "change price" or "change length" adds a new
  price and archives the old one.
- A renewal rule that matches the user's answer to open question 1.
- Pass "credits" and "valid for … from first use".
- Access hours, "who can buy" with member tags, and the desk/online channel.
- Locations on the product (today per benefit).
- Product note; holders per product; product activity with comments.
- Archive and restore a whole product. Restore lives in the ⋯ menu, which is
  not drawn yet.
- Sell (S) and Edit (E) shortcuts; New product ⌘↵.
- List "Sold" and "Last 30 days" columns, Filter, search, and Display.
- "Try again" on load errors; the app's error copy names the server, so
  rewrite it in staff words.
- Books with no programs chosen means "every program" in Rails; Paper's
  Books field needs a way to show that.
- Toasts should centre on the main column (the reference sits at a fixed x).

## 5. Open questions

1. **Renewals.** When a product's price changes, should members who renew move
   to the new price, or keep the price they first paid? Keeping it is what
   Rails does today, at no cost. Moving them means the renewal must find the
   product's current price and terms, decide which price to pick when several
   are on sale, and tell staff and members before the renewal; existing
   renewal records stay as they are.
2. **The product model** (above): follow Paper, Rails, or the recommended mix?
3. **Tickets.** Should Products list ticket products at all (read-only,
   linking to the program)? Today they live only on the program page.
4. **Archived vs. not sold.** Are they one state, or can a product be live but
   off both channels?
5. **⋯ menu.** What does the product page ⋯ hold? I assumed change actions
   only (archive, restore), so read-only roles see no ⋯ on the list or page.

## 6. Not verified

- I did not open the running app. States come from the code.
- Exact Rails `validation_failed` messages; frames use short staff-facing copy.
- Phone layouts for the new frames.
- "Booking rules & settings" (`p-C-0`) was not edited.

## Review fixes

From `docs/paper-redesign/reviews/products.md`:

1. Saved toast promised "until renewal" — fixed: "Product saved · New sales use
   these terms." My copies of the Monthly unlimited note no longer repeat the
   promise.
2. Renewal conflict missing — fixed: Conflict 4 and open question 1.
3. Server error inside the title block — fixed: plain line between head and
   first band; head matches the original.
4. Archived said four times — fixed: pill and event only; notice and Sold row removed.
5. Saved frame showed no change — fixed: new access hours and a new event.
6. ⋯ on read-only list frames — fixed: removed on both list frames and the page.
7. Duplicate "Add price" in Option B empty row — fixed: inline button removed.
8. Mixed words in Option B — fixed: "Not on sale" everywhere; "created" as the verb.
9. "5 visits per period" on a pass — fixed: "5 visits".
10. "New sales only" band fact — fixed: "Changes apply to new sales".
11. "Launch offer" — fixed: price renamed "Student".
12. No Option B edit frame — fixed: "Option B · Edit product".
13. Menu flip not shown — fixed: "Option B · Product details — put price on sale".
14. Toast position — not fixed: copies the reference; listed as build work.
15. Long amount error — fixed: "Enter an amount, like 120.50."
16. Empty Books scope — not fixed in frames; listed as build work.
17. "0" plus "No holders yet" — fixed: count removed.
18. Head repeats prices on sale — not fixed: follows the originals, which repeat price and length.
19. No Restore — not fixed: noted under build work (⋯ menu not drawn).
20. Wrong spacing number — fixed: state rows end at y 5920, Option B starts at y 7600.
21. Inherited raw colors — not fixed: they come from the user's originals.
- Coverage gaps (put on sale, failed price action, add price error and
  success, benefit errors, no `programs:read`) — fixed; see Coverage.
- The user's originals "New product — 3 · Missing price" (`YXG-0`) and
  "Product details — Archive" (`11BJ-0`) sit exactly on top of each other at
  (3040, 1200). I did not move them; the user may want to.

# Products — design review

Page "Products" (`p-I-0`) in "Flowfokus Redesign". Read-only review of the new
state frames, the Option B block, and `docs/paper-redesign/reports/products.md`.
I compared each new frame with the original it was cloned from and with the
references. I checked facts against `packages/api/src/schema.d.ts`,
`docs/models.md`, `apps/server/app/models`, and the portal code.

Confirmed: the original frames "New product — 3 · Missing price" (`YXG-0`) and
"Product details — Archive" (`11BJ-0`) sit at the same position (3040, 1200)
and overlap completely. This is not counted against the new work.

## Findings

### Must fix

1. **Product details — saved (toast)** (`20X3-0`). The toast says "Holders keep
   their terms until renewal." Rails does not do this. A renewal copies the
   member's agreed line item, with its price and terms, even after the price
   changes or is archived (`Sale.renew!`, `Member#agreed_line_item`). Holders
   keep their terms through every renewal. Say what Rails does, for example
   "New sales use the changes. Current holders keep theirs." The same false
   promise sits in two original frames; see finding 2.

2. **Report, "Conflicts"** (`reports/products.md`). The report misses the
   renewal conflict above. "Edit product — price changed" (`1408-0`, helper
   "142 holders keep RM 220.00 until renewal") and the note on "Product
   details — Monthly unlimited" (`Z31-0`, "Existing members keep RM 220 until
   renewal") both assume a renewal moves the member to the new price. Under
   Rails they stay on RM 220 for good. Add this as a fourth conflict, and as
   an open question: should a renewal move members to the current price?

3. **New product — 5 · Server error** (`26AS-0`) and **Edit product — server
   error** (`28YT-0`). The notice sits inside the title block, indented to the
   title (x 344). It pushes the title up, so the title no longer centres on the
   40px tile, as it does in `YHI-0` and `1408-0`. Keep the page head exactly
   as in the original. Put the notice below the head, on the content lane
   (left edge 292, like the field labels), or use the error toast style. The
   bordered box also adds a line the direction avoids.

### Should fix

4. **Pass details — archived, cannot be sold** (`22E6-0`). The page says
   "archived" four times: the pill, the bordered notice, "Sold: Not sold",
   and the activity event. DESIGN.md says to show each fact once and to drop
   banners that repeat a fact. Keep the pill and the event. Drop the notice,
   or cut it to the one new fact (31 holders keep their credits) as a plain
   line. If a notice stays, align it to the content lane (292), not to the
   title (344).

5. **Product details — saved (toast)** (`20X3-0`). Nothing on the page shows
   the save. The activity feed is the same as `Z31-0`. Add the event (for
   example "Kennedy changed access hours"), as "just created" (`20PP-0`) does.

6. **Products — list, read only** (`1X98-0`) and **Products — No products,
   read only** (`206S-0`). Both keep the ⋯ button. "Product details — read
   only" (`20IB-0`) removes ⋯ because it may hold change actions. Treat ⋯ the
   same on both pages, or say in the report what the list ⋯ holds.

7. **Option B · Pass details — added, no prices** (`1BWQ-0`). "Add price"
   appears twice: in the top bar and as a button in the empty row. Page
   actions live in the top bar, and the original empty state ("Products — No
   products", `114C-0`) has only a line. Keep the line, drop the inline button.

8. **Option B, product words.** The list (`1KUQ-0`) says "Not for sale". The
   detail frames say "Not on sale". Use one term ("Not on sale", as the app
   does). The toast in `1BWQ-0` says "Product added"; the Paper flow says
   "Off-peak created" (`20PP-0`). Pick one verb for both models.

9. **Option B · Pass details — added, no prices** (`1BWQ-0`) says "5 visits
   per period". "Option B · Pass details — prices and benefits" (`1BQW-0`)
   says "10 bookings" with no period. Use one pattern. For a pass, "per
   period" reads oddly; "5 visits" is enough.

10. **Option B benefits band** (`1A06-0`, `1B9E-0`, `1GR5-0`, `1GWZ-0`,
    `1H2T-0`, `1H8N-0`, `1BQW-0`, `1BWQ-0`). The band fact "New sales only"
    is unclear. It means "edits apply to new sales; past sales keep their
    terms" (`ProductBenefit#terms`). Use a short fact that says that, or drop
    it.

11. **Option B · Pass details — prices and benefits** (`1BQW-0`). A price is
    labelled "Launch offer". Products use "product", never "offer". Use
    "Launch price".

12. **Option B has no Edit frame.** Every Option B detail has an Edit button,
    but no frame shows the Option B edit form (name, description, gym site,
    benefits; type cannot change). The user cannot compare the edit flows of
    the two models without it. Add one clone of `1P5B-0` as "Option B · Edit
    product".

13. **Option B · Product details — price menu** (`1B9E-0`). Only the menu of
    an on-sale price is shown. The app also has "Put on sale" for a price
    that is off sale (`PriceActions.tsx`). Show it, or add one line to the
    report that the menu flips.

### Notes

14. **Toasts** (`20PP-0`, `20X3-0`, `1H8N-0`, `1BWQ-0`). Each is left-anchored
    at x 560, like the reference `TWC-0`. Longer toasts drift right; the
    saved toast runs to x 1090. This copies the reference, so it is not an
    error, but the build should centre toasts on the main column.

15. **Option B · Add price — errors** (`1GWZ-0`). "Enter an amount, for
    example 120 or 120.50." wraps to two lines in the half-width column. The
    copy matches the app. A shorter message ("Enter an amount, like 120.50")
    fits one line.

16. **New product — 7 · Pass errors** (`27GQ-0`). "Pick at least one program"
    matches the app for "selected programs". In Rails an empty scope means
    every program. Paper's Books field has no "every program" choice, so
    the build must decide how Books shows that.

17. **Product details — just created** (`20PP-0`). The band shows "0" and the
    row says "No holders yet." That repeats one fact. Drop the "0".

18. **Option B detail head** (`1A06-0`, `1BQW-0`). "2 prices on sale" in the
    head repeats the band fact "2 on sale of 4". The originals repeat price
    and length in the head and properties too, so this follows them.

19. **Pass details — archived** (`22E6-0`). There is no Restore action. The
    report lists restore as Rails work, and the ⋯ menu is not drawn. Say where
    Restore lives when the menu is designed.

20. **Report placement note.** The report says Option B sits 480px below the
    last state row. It sits 1,680px below (state row ends at y 5920, Option
    B starts at 7600). Clear separation, wrong number.

21. **Inherited raw colors.** The canvas fill `#ECECEA` and the key-hint
    colors (`#FFFFFF24`, `#FFFFFFB3`, `#FFFFFF99`) are raw values. All come
    from the original frames; no new frame adds a raw color.

## Categories with no findings

- Text sizes: only 20, 13, and 12px on the page. No 10, 11, 14, 15, 16, or 18px.
- Font: Figtree (`var(--font-sans)` or "Figtree") throughout. No mono font.
- Raw hex colors: none added by the new frames (see note 21).
- Overlaps: no new artboard overlaps another. Rows sit 80px apart on the grid.
- Clipping: no content cut off at an artboard edge. No menu or dialog past the
  window edge; dialogs are centred on the window.
- Top bar: Search first, then actions, then ⋯. Read-only roles have no Edit,
  New product, or Add price. Sell stays for front desk, which is correct.
- Words: no "Deliver", no "plan". Only "offer" is the price label in note 11.
- Payment methods: none shown on this page.
- Option B separation: every frame starts "Option B · " and sits in its own
  block below the states.
- Option B Rails facts: price label, amount, term, on sale, archived date,
  published, description, benefit kind, usage, location, and program scope
  all match `StaffProduct`, `Price`, and `Benefit`. Add price, archive
  confirm, and their toasts use the app's own copy. Nothing shown is missing
  from Rails.

## Coverage spot-check

I checked five states that are easy to miss against `products.tsx`,
`OfferDialogs.tsx`, and `PriceActions.tsx`:

| Real state | Frame or reason |
| --- | --- |
| Price taken off sale / put on sale again, with toast | Not drawn, no reason given (see 13). Original model has no equivalent; maps to "Sold: Not sold"? Not stated. |
| Price change or archive fails ("The price did not change", "The price was not archived") | Not drawn, not in the report. |
| Add price server error ("The price was not added") and "Price added" toast | Not drawn, not in the report. |
| Product form benefit errors ("Add at least one benefit", "Enter a name for benefit 1", server field errors) | Only the pass Books error is drawn (`27GQ-0`). Option B has no form errors frame. Not in the report. |
| No `programs:read`: "Selected programs" disabled, "A removed program" | Not drawn, not in the report. |

The report covers loading, load error, empty, read-only, no permission,
create and save toasts, and create/save failures. The five above should be
added as frames or as stated reasons.

## On the product model question

The report's table is accurate for what it lists, and the three named
conflicts are real: `Price` makes amount, currency, product, and duration
read-only, and a database trigger enforces it. The table misses two Rails
facts that change the decision. First, renewals copy the agreed price for
good, so "holders keep the old price until renewal" is not true today.
Second, benefits are snapshotted into each sale, so editing access, programs,
or locations is already safe; only price and length need the "new price"
mechanism. I agree with the recommendation: keep Paper's one-price surface
and have "change price" or "change length" add a new price and archive the
old one. It leaves these open: whether renewals should move members to the
current price; how a gym sells two prices at once (monthly and yearly, a
founding rate) — Paper's answer seems to be separate products, as with
"Annual unlimited", and the report should say so; what "Not sold" maps to
(an off-sale price or an archived product); where benefits, their locations,
and their program scope are edited, since Paper's membership form never
says what the membership gives; and what a product-level archive and restore
do to its prices.

## Verdict

Not ready to build from yet, but close. The list, form, and detail states are
faithful clones of the originals, with clean type, tokens, and permission
branches. Three things block it: the false "until renewal" promise in the
saved toast, the missing renewal conflict in the report, and the server
error notice that breaks the page head. Fix those, decide the ⋯ and archive
notice questions, and add the Option B edit frame so the user can make the
model choice with both edit flows in view.

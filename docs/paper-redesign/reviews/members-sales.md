# Members and Sales — design review

Review of the state frames added to "Members" (`p-8-0`), "Member details"
(`p-6-0`), "New member" (`p-H-0`), "Sales" (`p-E-0`), "Sale details"
(`p-F-0`), and "New sale" (`p-G-0`) in "Flowfokus Redesign". The standard is
`docs/paper-redesign/brief.md`. The designer's report is
`docs/paper-redesign/reports/members-sales.md`.

I took a screenshot of every new frame and of the original it was cloned from.
I checked the states against `apps/portal/src/features/members`,
`apps/portal/src/features/sales`, and the Rails models and controllers. I did
not open the running app.

Count: the pages hold 33 new frames and one dialog sheet, not 36 frames. The
report's "Added" list matches the 33.

## Must fix

1. **Sale details — "Sale details — read only" (`2V14-0`).** The page still
   has the Note edit pencil and the comment box with its Comment button. A
   read-only role has no change actions, including property edits. Remove the
   pencil, and remove the comment box (or show the feed without it).

## Should fix

2. **Sale details — "Sales — Dialogs and menu · more states" (`2U9F-0`),
   Fulfill early dialog.** It is redrawn as a confirm question ("Fulfill sale
   #1058 early?") with no item row, no header fact, and no ⌘↵ hint. The
   original Fulfill dialog in "Sales — Dialogs and menu" (`NY5-0`) is "Fulfill
   items": a title, the fact "#1061 · Mei Ling Tan" on the right, the item
   row, and "Fulfill items ⌘↵". Clone that dialog. Keep its title and item
   row. Add the "RM 100.00 stays due" line, the Reason row with its error, and
   change the button to "Fulfill early ⌘↵". The app also has ⌘↵ on this button.

3. **Sale details — "Sale details — role cannot fulfill unpaid" (`2UTP-0`)
   and New sale — "New sale — 3e · Role cannot record payments" (`2VOM-0`).**
   Both use "Aina · Front desk". In `2UTP-0` Aina has Record payment and Send
   invoice. In `2VOM-0` Aina cannot record payments. The same role cannot be
   both. Use a second sample person for one frame, or remove Record payment
   from `2UTP-0` and say the role lacks both permissions.

4. **Member details — "Member details — read only · balance due" (`2TIF-0`).**
   Two faults.
   - Facts disagree. Sale #1047 now has RM 100.00 paid, not RM 200.00, but
     "Total spent" still says RM 2,000.00, as in the fully paid original. It
     should be RM 1,900.00.
   - It is not read only. Check in, Book, the Tags "+", the Notes "+", and the
     comment box stay. The report says this frame is a role without
     `purchases:create` (and without `members:link`). Rename it to say that,
     for example "Member details — role cannot sell · balance due". If it is
     meant as a read-only role, remove every change action.

5. **Member details — "Member details — Unlink sign-in" (`2SCE-0`).** The
   value "Linked · priya.nair@gmail.com" wraps to two lines in the properties
   column. Text must not wrap. Truncate the email with an ellipsis on one
   line, or show "Linked" with the email as secondary text, the same way in
   every frame that shows a linked value.

6. **New sale — "New sale — 1d · No products to sell" (`2WDN-0`).** The frame
   removes "+ Custom item" as well as "+ Product". In Paper's design a custom
   item needs no priced product, so staff can still sell one. Keep "+ Custom
   item" (in the empty box, as in `OWZ-0`) and put the one line next to it.
   Also: the app shows "Open Products" only to roles with `products:update`.
   Say so in the report.

7. **All no-permission frames** — "Members — no permission" (`2FF6-0`),
   "Sales — no permission" (`2IQI-0`), "New member — 7 · No permission"
   (`2PSU-0`), "New sale — 7 · No permission" (`2WII-0`). Each line ends with a
   permission code ("Ask an owner for members:read."). The task asks for staff
   words. Write what to ask for in words, for example "Your role cannot view
   members. Ask an owner to add this to your role." If the code must stay for
   owners, put it after the words, not as the request.

8. **New sale — "New sale — 8 · Products or members did not load"
   (`2WNN-0`).** Every other load error has one "Try again" button. This one
   says "reload the page" and has no button. Use the same line and "Try
   again" as the other load errors.

9. **Members — "Members — load error" (`2F6Q-0`) and "Members — no members
   yet" (`2FAY-0`).** They drop the column header band. The Sales versions
   (`2IGS-0`, `2ILN-0`) keep it, and "Members — loading" (`2F2I-0`) keeps it
   too. Pick one rule for both lists. Keeping the band matches the loading
   frames.

## Notes

10. **Member details — "Member details — Gym site menu, not linked"
    (`2R6J-0`).** The menu ends about 10px from the window edge and covers the
    "Home location" label. It does not cover its own row, so it is acceptable.
    It would sit better if it were no wider than the value column.

11. **Member details — "Member details — loading" (`2TXC-0`) and Sale details —
    "Sale details — loading" (`2UD8-0`).** The skeleton bands run the full
    width, over the place where the properties column sits. Real bands stop at
    the content column. End the bands at the content column so the page does
    not jump when it loads.

12. **Members — loading, load error, no members yet (`2F2I-0`, `2F6Q-0`,
    `2FAY-0`) and the Sales equivalents (`2IBX-0`, `2IGS-0`, `2ILN-0`).**
    Filter, search, and Display stay active with no rows. They do nothing in
    these states. Consider hiding them or showing them disabled.

13. **State lines sit at different heights.** The no-permission line is at
    about y=245 on both lists. The load error and empty lines are at y=298
    (Members) and y=334 (Sales). Use one position per list.

14. **Missing result and failure frames for the gym site sign-in.** The app
    shows "Sign-in unlinked" after Unlink (the value becomes "Not linked"), and
    error toasts when the code is not created or the unlink fails. No frame
    shows these. The toast pattern (`TWC-0`) covers them, so a builder can
    follow it. Add one line to the report.

15. **Renew result.** The app opens the new sale with a "Renewal recorded"
    toast. The original "Member details — Priya Nair" (`DNR-0`) shows
    "Renewed and checked in · View sale" on the member page. Paper wins. Add
    this difference to the report under "Needs app or Rails work".

16. **New member — "New member — 3b · Email already used" (`2LW3-0`).** The
    error says "Already used by Mei Ling Tan · Open member". Rails only says
    the email "is already used by another member". It returns no member name
    or link. Add this to "Needs app or Rails work".

17. **Sale details has no no-permission frame.** A role without
    `purchases:read` that opens a sale link sees the "Sales — no permission"
    line. The report says this for members but not for sales. Add one line.

18. **The report is out of date in one place.** It says "Sales — list · no
    results" (`UQH-0`) shows "1–50 of 1,284 sales" under an empty list. The
    frame no longer shows that footer.

## Was each frame needed?

Each new frame covers a state that no original frame covers. I found no
duplicates. "Member details — ⋯ menu · Renew" (`2T4O-0`) is the only place
the member ⋯ menu is drawn, so it is needed, even though `14DP-0` already
shows the Cancel membership dialog.

## Truth to the app

- Gym site sign-in: the menu holds one item, as in the app (Create link code
  when not linked, Unlink sign-in… when linked). The code, "works once, until
  19 Nov", and "They enter it after signing in on the gym site" match the app.
  The Unlink confirm title and body match the app and add the "history stays"
  fact from the success toast. Correct.
- Renew: the ⋯ item "Renew membership…", the confirm with the agreed price,
  the start date, and the location, and the failure line "The renewal was not
  recorded. Nothing was sold. Try again." match `RenewDialog`. The start date
  (3 Dec) agrees with the period that ends 2 Dec. Correct.
- Fulfill early: the reason is required, as in `Fulfillment.deliver!`. End
  access: reason required, as in `SalesController#revoke`. Role cannot fulfill
  unpaid: the note matches `SaleDetails.tsx` word for word. The ⋯ menu
  without Refund, End access, and Void matches `saleActions`.
- New sale: "created, payment not recorded" shows the sale page with no
  payment and RM 530.00 due, and Record payment as the next step. That is the
  right next step, because the sale exists and must not be created twice.
  "Not created" keeps every field and says nothing was saved or paid. Correct.
  "Role cannot record payments" removes only Record payment, as the app does
  with `payments:create`.

## The report's conflicts

- **Refund with "Also end access".** Rails keeps refund and revoke apart on
  purpose (`Refund` model comment). Revoke needs `memberships:revoke` and its
  own reason. This is not impossible: the app could send a refund and then a
  revoke. But that is two requests that can half succeed, and the checkbox
  must be hidden from roles without `memberships:revoke`. **Open decision for
  the user**, not a hard conflict.
- **Fulfill without a reason.** "Exploration — Fulfill items dialog"
  (`RUR-0`) A and B fulfill #1061 with RM 530.00 due and "reason removed".
  Rails raises unless an early reason is given when money is due, and the
  brief requires "Fulfill early". **Real conflict** under the business rules.
  It is an exploration frame, so it should not be built as drawn.
- **Status words.** Rails stores paid, partially_paid, unpaid, and void.
  "Refunded" and "Access ended" can be derived from Rails facts, so these are
  word choices. **Open decision.** Each new frame uses the words of its own
  original: "Partial" on Member details, "Partly paid" and "Unpaid" on Sale
  details, "End access" in the dialogs. No new frame mixes the two sets. The
  originals themselves differ ("Partial" against "Partly paid"), so the user
  must pick one set.
- **Email "Optional".** `Member` validates email presence and uniqueness.
  Under the current rules this is a **real conflict**. Making email optional
  would change Rails, and the duplicate-email check and the gym site link
  both depend on it. The user must decide.

## Coverage

- **New sale loading.** The Sale details loading frame is not enough on its
  own. `NewSaleLoading` shows the real tile and title "New sale", two section
  skeletons, and a side column with a field skeleton. The Sale details frame
  hides the title and has no side column. A builder would have to guess the
  title, the side column, and whether Create sale shows. Add one frame, or
  one line in the report that states these three points.
- Other gaps are notes 14, 15, and 17 above.

## Categories with no findings

- Words: no "Deliver" anywhere in the file. "Fulfill" family is used throughout.
- Text sizes: no new frame uses a size other than 20, 13, or 12px.
- Fonts: Figtree only; no mono font. The link code uses tabular figures.
- Colors: the frames I inspected use tokens; I found no raw hex.
- Placement: all new artboards sit on the 80px grid, in free space, with no overlap.
- Confirms: Unlink and Renew match "Discard changes?" (`TP2-0`): no header
  band, no close button, Cancel and the action at the bottom right.
- Result frames: "New sale — 5 · Created, payment not recorded" shows the page
  after the action, and its facts agree.

## Verdict

The set is close. Most frames are faithful clones of their originals, the
states match the app, and the error lines tell staff what to do next. It is
not ready to build from yet. Fix the read-only Sale details frame first (it
shows edit actions to a role that has none). Then fix the redrawn Fulfill
early dialog, the conflicting Aina role, the wrong total on the member frame,
and the wrapped linked value. Those five changes are small. After them, and
with one line on New sale loading, a builder can work from this set without
guessing.

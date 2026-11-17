# Check-ins — design review

Page "Check-ins" (`p-J-0`) in "Flowfokus Redesign". I reviewed new frames 7–31
against originals 1–6, Member details (`DNR-0`), and Sales filtering (`U3Z-0`,
`UQH-0`). I took a screenshot of every frame and read exact values with
`get_jsx`. I checked facts against `CheckInPanel.tsx`, `format.ts` (`DENIAL`),
`CheckIn`, `Entitlement`, `Staff::CheckInsController`, and `docs/models.md`.

## Findings

### Must fix

1. **23 · Member page · Denied (`2735-0`).** The dialog says "Monthly
   unlimited · Bangsar and Mont Kiara only". One right has one `location_id`,
   or none for all locations (`Entitlement#covers_location?`). So one right
   cannot cover two named locations. **Fix:** "Monthly unlimited · Bangsar
   only". This also agrees with frames 1 and 22, where Priya checks in at
   Bangsar.

2. **11 · Checked in · Credit used (`1XS2-0`) and 20 · Let in by staff
   (`2597-0`).** The new top row replaces Priya Nair's 07:42 row. It does not
   push it down. The footer adds one (87), but the list loses a row. **Fix:**
   Insert the new row above 07:42 Priya Nair, as frame 3's list shows it. Keep
   all seven original rows below it.

3. **25 · Filtered · Denied (`29W8-0`).** The list shows two denied rows. The
   footer says "3 denied today", and frame 24's menu says Denied (3). A
   filtered list that shows fewer rows than its own count looks broken.
   **Fix:** Add a third denied row (an earlier time, before 06:40). Or change
   all three counts to 2.

### Should fix

4. **14 · Not valid here (`21DA-0`), 15 · No visits left (`21KO-0`),
   16 (`21S2-0`), 17 (`21ZG-0`).** The list behind each dialog does not show
   the attempt. In original 4, Farah's denied row is in the list under the
   dialog. In 15 the list even disagrees with the dialog: Sara Lee's row says
   "Denied · Outside access hours" and the dialog says "8 of 8 visits used".
   In 14, Ahmad Faiz's only row says "Checked in" at 07:05. Priyanka Das (16)
   and Kevin Ong (17) have no row. **Fix:** Add each denied attempt as the top
   row ("Denied · Not valid here", "Denied · No visits left", and so on), with
   the footer at "87 check-ins today · 4 denied". In 15, use the new top row
   and leave Sara's 06:58 row as drawn.

5. **14 · Not valid here (`21DA-0`) and 23 (`2735-0`).** The main button is
   New sale. The member already has an active membership, so selling another
   one is not the fix. The app offers no fix step for this reason, only "Open
   member". **Fix:** No dark button. The footer has "Let in anyway…" and
   Close. This answers the report's open question.

6. **15 · No visits left (`21KO-0`).** The main button is New sale. The app
   says "Sell a renewal", and Member details has Renew in its ⋯ menu.
   **Fix:** Name the button "Renew", the same as the member page.

7. **16 · Sale awaiting payment (`21S2-0`).** Record payment alone does not
   let Priyanka in. A staff payment does not fulfill the sale. Only an online
   checkout fulfills on payment (`Checkout#complete!`). After the payment,
   the member is in the frame 17 state. **Fix:** Show the step after Record
   payment: the payment dialog ends with Fulfill, or this dialog offers
   "Fulfill early" next to Record payment when the role has
   `purchases:fulfill_unpaid`. Use the "Fulfill early" words from the brief.

8. **18 · Let in anyway (`22MC-0`).** The frame does not say that the reason
   is recorded until the error in frame 19 says so. A consequence is allowed
   by the brief. **Fix:** Label the field "Reason · saved on the check-in", or
   put "Saved on Farah's check-in. Nothing is used." as a 12px grey line under
   the field. Keep frame 19's error as is.

9. **10 · Find member · No location (`1WIF-0`).** The list behind shows 86
   check-ins at Bangsar. An organization with no location cannot have any
   check-ins, because each check-in needs a location. **Fix:** Put the search
   over the frame 6 empty state ("No check-ins yet today").

10. **12 · Check-in not recorded (`1XZ0-0`).** The failed attempt is for Priya
    Nair, whose 07:42 row says "Checked in" in the same list. A reader will
    think the 07:42 row failed. **Fix:** Use a member with no row today, such
    as Mei Ling Tan.

### Notes

11. **The staff override, as design.** It works. The link sits alone at the
    left of the footer, in 12px grey text, away from Close and the main
    button. A staff member finds it, but it does not compete with the fix.
    The dialog keeps its title and facts, so it still reads as original 4.
    **Recommendation:** Keep the neutral dark button ("Let in Farah"). The
    required reason is the friction. Red means loss or danger in this design,
    and letting a member in loses nothing and uses nothing. Change the app's
    `variant="destructive"` to the primary button when it is built. Draw a
    hover fill on the link so the build gives it a button target, not plain
    text.

12. **16 and 17 are the same Rails reason.** Rails returns `no_entitlement`
    for both. It also returns it for "access ended" (13) and for a member who
    never had a right. The check-in response cannot tell these apart. The
    portal can tell them apart only if it also loads the member's open sales:
    an unpaid or partly paid sale with gym access (16), or a paid sale that is
    not fulfilled (17). The report lists "denial dialog facts" as app work;
    say there that this case split is derived, not a Rails reason.

13. **17 · Sale not fulfilled (`21ZG-0`).** On the Sales page, Kevin Ong's
    unfulfilled sale is "Fitness assessment" (#1052), not Monthly unlimited.
    Pick a member whose Sales row matches, or accept the mismatch as sample
    data.

14. **27 · More · Export visits (`2AM6-0`).** "CSV" sits in the slot that
    holds key hints in other menus. The brief shows hints only for real
    shortcuts. Consider "Export visits as CSV" with no hint.

15. **31 · No permission (`2BD6-0`).** The lock tile sits 16px lower than the
    tile in frame 6. Match frame 6's position, since neither has a header
    band.

16. **Artboard spacing.** Rows sit 160px apart (0, 1160, 2320). The brief asks
    for 80px. Nothing overlaps.

17. **Inherited values.** The dialog title is 14px, and the canvas, logo, and
    shadows use raw hex values. These come from the originals and the cloned
    window. They are not new work. Do not change them in the new frames alone.

18. **9 · Search failed (`1WB9-0`).** The message shortens the app's
    `api_unreachable` text. That is fine for staff. Frame 29 uses the real
    `database_unavailable` text.

## The report's conflicts

- **"Walk-in": real conflict.** `CheckIn` belongs to a member. Rails rejects a
  check-in with no member. `docs/models.md` calls a check-in "an access
  attempt by a member". Guests exist only on bookings.
- **"Morning strength · Booked" as gym access: real conflict.**
  `authorize_and_consume!` reads `gym_access` rights only, and
  `docs/models.md` says "Only `gym_access` rights open the gym floor". A
  booking uses a program right, so it cannot be the access of a check-in.
- **"Outside access hours": not a conflict. Rails lacks it.** No rule forbids
  access hours. Rails has no time window on a right today, and
  `DENIAL_REASONS` lists three reasons. A product called "Off-peak" implies
  hours. So this belongs in "Needs app or Rails work" (a time window on gym
  access rights and a fourth denial reason), per the brief's "Paper wins"
  rule. The designer should not reinterpret Sara Lee's denial as "no visits
  left" (frame 15). Use another member for that case. The user must decide
  whether off-peak hours are in scope.
- **"Access ended 3 Nov":** I agree with the report. It is a fair form of
  `no_entitlement`.

## Categories with no findings

- Fidelity: window, sidebar, top bar, columns, row style, toast style, and
  dialog style match the originals in every frame.
- Top bar and permissions: Search, Check in, ⋯ in order. Export visits is in
  ⋯ (27). Frame 30 has no Check in. Frame 31 names `check_ins:read`. Frame 21
  hides the override link for a role without `check_ins:override`.
- Words: no "Deliver". "Checked in" and "Denied · <reason>" as in the
  originals. "paid, unfulfilled" and "Fulfill sale" use the Fulfill family.
- Visual quality: no clipped text, no overflow, lanes align, dialogs and menus
  sit inside the window, every dialog has the dimmed page, toasts sit at the
  bottom centre, fonts are Figtree, and new text uses 13px and 12px only.
- Filters (24, 26): the menu, chip, and no-results state follow Sales
  `U3Z-0` and `UQH-0`.

## Verdict

Not ready to build yet, but close. The structure is right. Every new frame
reads as a state of the user's list, search, toast, and denial dialog, and the
override fits the original dialog well. The blockers are content facts a
builder would copy: an impossible two-location right (23), lists that lose a
row (11, 20), and a filtered count that disagrees with its rows (25). Fix
those three, then the "should fix" items on the next steps (14, 15, 16, 23)
and the missing denied rows (14–17). After that, the set can be built from.
The user must still decide on access hours and on Walk-in before the list rows
are built.

# Reports — design review

Page "Reports" (`p-L-0`) in "Flowfokus Redesign". This is a read-only review of
the 11 new frames and `docs/paper-redesign/reports/reports.md`. I compared each
new frame with the original it was cloned from, and with the location switcher
(`17B4-0`), the toast (`TWC-0`), and the Sales list pager (`LYF-0`). I read
`features/reports/Reports.tsx` and `routes/$org/reports.tsx`.

The page has 18 artboards: 7 original and 11 new. The report says "I added 13
frames", but it lists 11, and the page holds 11. Correct the count. The new
frames sit in two rows under the originals, 80px apart, with no overlap.

## Findings

### Must fix

1. **Reports — no permission** (`2D57-0`). The message has a 40px lock tile
   (`2EBZ-0`) above it. The brief says empty and no-permission states are one
   plain line with no icon tile. Remove the tile. Keep the line: "Your role
   cannot view reports. Ask an owner for sales and check-ins access."

2. **Reports — list · did not load** (`2D04-0`). The error has a 40px tile with
   a red alert icon (`2DX8-0`). Remove the tile, as for the no-permission
   frame. Keep the one line and "Try again". If the line needs a mark, use the
   notice style: a small icon inline with the text, not a tile.

3. **Reports — Balance due · long list, paged** (`2J9K-0`). Two sale numbers on
   page 1 are already used by other sales in the Sales list (`LYF-0`):
   `#1049` is Daniel Wong, Paid, RM 220.00 there, but Arjun Pillai, Partly
   paid, RM 60.00 here. `#1051` is Farah Aziz, Refunded, there, but Lim Wei
   Jie, Unpaid, RM 24.00 here. The report's page 2 has the same problem:
   `#1053` (Walk-in, Paid) and `#1057` (Mei Ling Tan, Paid) in `LYF-0`. One
   sale number must mean one sale in the whole file. Use sale numbers that no
   other frame uses (for example below `#1041`), or reuse the real sales from
   `LYF-0` that have a balance (`#1055` Sara Lee, `#1058` Hafiz Rahman).
   Update the page-2 list in the report to match.

### Should fix

4. **Report, "Conflicts"** (`reports/reports.md`). Card, E-wallet, and Online
   (Stripe) in "Payments by method" (`11TM-0`) are not a conflict. The brief
   says the original frames keep these methods, and whether they stay is the
   user's decision. Move this item to "Open questions". The same applies to
   "Outside access hours" in "Check-ins" (`125O-0`): the user designed a
   denial reason that Rails does not produce yet. That is an open decision
   (add the reason to Rails, or drop the row), not a conflict. Also list it
   under "Needs app or Rails work" if the user keeps it.

5. **Report, Sales total** (`10WG-0`). I confirm the sum: the product rows
   add up to 178 sold (64 + 31 + 3 + 22 + 58), against "Sales 214". Amounts
   add up to RM 41,260.00, the same as Total sales, so the table covers every
   sale. This is a real conflict, but the report's reason is wrong. The report
   says the two numbers "must be equal". They need not be: a ticket sale can
   buy several spots, so 58 program tickets can come from fewer than 58 sales.
   The rule is that Sales can never be more than units sold. Fix the reason.
   Rename the column to make the unit clear if needed ("Sold" counts spots for
   tickets).

6. **Reports — Sales · more menu, Export** (`2ECH-0`), **· exported (toast)**
   (`2EII-0`). These clones show "Sales 178", but the original shows 214. A
   state frame must match its original. Until the user settles the conflict,
   keep 214 in the clones, or say clearly in the report that the clones
   already use the corrected number. Do not let the two frames disagree
   silently.

7. **Report, Program attendance total** (`12HQ-0`). I confirm the sum: the
   rows add up to 78 sessions (12 + 20 + 16 + 16 + 14), against "Sessions
   186". Unlike Sales, nothing on this frame proves the table lists every
   program. Say in the report that this is a conflict only if the table is
   complete. Also, "Spots booked 78%" does not match the rows: the plain
   average is 69.8% and the average weighted by sessions is 69.5%. It can be
   true only if Yoga Flow and Morning strength have much larger capacity. Add
   this to the same conflict entry. No-shows 4% matches the plain average.

8. **Reports — list · loading** (`2CV1-0`) and **Reports — list · did not
   load** (`2D04-0`). Both keep the ⋯ button. **Reports — Sales · loading**
   (`2EUK-0`) removes it, because Export cannot work while loading. Treat ⋯
   the same way on the list. The report must also say what the list's ⋯
   holds. If it holds only an export, remove it in loading and error states.

9. **Reports — Balance due · long list, paged** (`2J9K-0`). The balance cells
   (for example `2JAQ-0`) and the figure row (`2JBV-0`) have no
   `font-feature-settings: "tnum"`. The original `11ZN-0` has the same gap,
   and so does the amount column of `11TM-0`. The Sales report cells
   (`113E-0`) have it. Add "tnum" to money, age, and count cells in the paged
   frame, and list the original gap under "Not verified" or as a note for the
   build, since originals are not edited.

10. **Coverage: report detail pages have no load-error frame.** The list has
    "did not load", but a single report page (for example Sales) can fail
    too, and it is a separate route in Paper. Add "Reports — Sales · did not
    load", or say in the report that every report page uses the list's error
    line under its own title and range control.

11. **Coverage: Check-ins has a state the Sales frames do not cover.** A range
    with check-ins but no denials leaves the "Denied because" table empty.
    Draw it, or state the rule (hide the table, or one line "No check-ins
    were denied").

### Note

12. **Reports — Sales · more menu, Export** (`2ECH-0`). The ⋯ menu holds one
    item, Export CSV. The brief puts ⋯ only where there are more actions.
    The originals draw ⋯ on every report, so keeping Export inside it follows
    the originals. It costs one extra click. Ask the user whether Export
    should be a top-bar button, or whether ⋯ will hold more (for example
    Print).

13. **Reports — Sales · no data** (`2EOJ-0`) and **Reports — Balance due ·
    nothing due** (`2JEZ-0`). The footer sits about 140px below the empty
    line, at the height of the removed content. It reads as detached. Place
    it under the empty line with the normal section gap, or drop it, since the
    range control already shows the range.

14. **Reports — Sales · loading** (`2EUK-0`). The figure labels move left
    ("Collected" at 444 instead of 461, "Sales" at 684 instead of 713),
    because the skeleton bars are narrower than the real values. Give each
    figure a fixed width, so the labels stay in place when data loads.

15. **Loading frames** (`2CV1-0`, `2EUK-0`). They keep the range ("This
    month", "Last 30 days") and the column labels "This month / vs October".
    These come from the URL, not from loaded data, so this is correct. The
    breadcrumb names only the page. No change needed.

16. **Report, "Open questions".** Add: which options does the Balance due
    "Now" control offer? No frame shows its menu. Add also: with "All
    locations" selected, the footer and figures change scope; no frame shows
    it, which is fine if the rule is "same page, all locations".

## Categories with nothing found

- Fidelity: every new frame is a clone of its original. Title, range control,
  figure row, chart, table band, rows, and footer match.
- Charts: no new chart style. The loading chart is a plain baseline. The
  no-data frame has no fake bars.
- Menus: the date-range menu (`2DBA-0`) and the more menu (`2F20-0`) use the
  switcher's exact menu style (popover, 10px radius, 4px padding, 32px items,
  accent selected row, same check mark). Both sit 4px under their control and
  stay inside the window. The location menu is the Home menu, cloned.
- Toast: `2EII-0` matches `TWC-0` in style and position. Export changes
  nothing on the page, so the unchanged page is true.
- Numbers: the Sales clones add up (RM 41,260.00, shares 34 + 21 + 16 + 8 +
  21 = 100%, bar lengths match). Balance due page 1 adds up to RM 1,313.00;
  with the report's page 2 (RM 565.00) the total is RM 1,878.00 for 14 sales,
  oldest 34 days. The footer "1–10 of 14 sales" and the two-page pager agree.
  In the originals, Payments by method (RM 40,620.00, 231 payments, shares),
  Check-ins (41 denied), and Memberships (249, 34, 28, net +6) all add up.
- Text: only 20, 13, and 12px, plus 16px in the figure rows, as in the
  originals. Figtree only. No raw hex in the new content. No clipped or
  wrapped text.
- Top bar: Search, then ⋯. No page actions are invented.
- Error and permission copy: no mention of Rails, the API, or a server.

## Coverage of the other four reports

- **Payments by method:** loading, no data, and export can follow the Sales
  frames as drawn. The no-data line is "No payments in the last 30 days".
- **Check-ins:** loading and no data can follow Sales. The "no denials" state
  needs a frame or a rule (finding 11).
- **Memberships:** needs its own no-data rule. "Active now" is a current
  fact, so a range with no starts or ends still shows active counts and zeros,
  not the Sales empty line. Loading follows Sales.
- **Program attendance:** loading follows Sales. No data follows Sales ("No
  sessions in the last 30 days"). The no-show definition is still open.
- **Paged state:** only Balance due lists records that can grow without limit.
  The others list products, methods, or programs, and do not need a pager.
- The app's chart metric switch and the CSV-only "New members" figure have no
  frame, with stated reasons. That is acceptable.

## Verdict

Not ready yet, but close. The frames are faithful clones, the menus and toast
match their references, and the numbers add up. Fix the three must-fix items
first: remove the two icon tiles, and give the paged Balance due list sale
numbers that do not clash with the Sales list. Then correct the report: move
the payment-method and denial-reason items to "Open questions", fix the
reason for the Sales count conflict, and note the Program attendance share
mismatch. With those changes, and a stated rule for the detail-page error and
the Check-ins "no denials" case, the set is ready to build from.

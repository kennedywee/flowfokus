# Reports — Paper coverage report

Paper page: "Reports" (`p-L-0`). The seven original frames are unchanged.
I added 12 frames in two rows under them. All are clones of an original
Reports frame, with only the state changed.

## 1. Coverage

The real app has one Reports page (`features/reports/Reports.tsx`). It loads
weekly figures from `GET /staff/report`. Rails needs `purchases:read` and
`check_ins:read`.

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Reports page, loaded | Reports — list | existed |
| Period control (This week, Last 2, 4, 12 weeks) | Reports — list · date range open | added |
| Location (app shows "All locations" only) | Reports — list · location open | added |
| Loading (`SkeletonRows`) | Reports — list · loading; Reports — Sales · loading | added |
| Did not load (`FailureNotice`) | Reports — list · did not load; Reports — Sales · did not load | added |
| Role without the permissions (Rails 403) | Reports — no permission | added |
| Export report (CSV download) | Reports — Sales · more menu, Export | added |
| Export result | Reports — Sales · exported (toast) | added |
| No data for the range | Reports — Sales · no data; Reports — Balance due · nothing due | added |
| Long table that pages | Reports — Balance due · long list, paged | added |
| Membership sales total, sale count, by-location sales | Reports — Sales | existed |
| Money received (payments, refunds) | Reports — Sales (Collected, Refunded) | existed |
| Payment methods breakdown | Reports — Payments by method | existed |
| Check-ins granted and denied | Reports — Check-ins | existed |
| Week-by-week chart with metric switch | Reports — Sales (daily bars), Reports — Check-ins (by hour) | existed, different shape |
| New members per week (CSV only) | none | not designed: the app shows it only in the CSV |
| Chart metric switch | none | not designed: Paper has one chart per report, no switch |

### Where each real figure belongs

- `sales_minor`, `sale_count` → Reports — Sales (Total sales, Sales) and the list's Sales row.
- `payments_minor`, `refunds_minor` → Reports — Sales (Collected, Refunded) and Reports — Payments by method (Collected, Refunded).
- `by_method` → Reports — Payments by method table.
- `check_ins_granted`, `check_ins_denied` → Reports — Check-ins (Check-ins, Denied) and the list's Check-ins row.
- `by_location` → no Paper place. Paper scopes every report by the top-bar location instead.
- `new_members` → no Paper place.

### Original reports with no data in the app yet

Balance due, Memberships, Program attendance, Sales by product, Check-ins by
hour and by reason, and every "vs previous period" comparison.

### Rules for the other report pages

- **Payments by method, Check-ins, Program attendance** follow the Sales frames for loading, did not load, no data, and export. The no-data lines are "No payments in the last 30 days", "No check-ins in the last 30 days", and "No sessions in the last 30 days", each with "Show last 90 days".
- **Check-ins with no denied check-ins:** the figure row shows "Denied 0". The "Denied because" table is replaced by one plain line under the chart: "No check-ins were denied". No action.
- **Memberships with nothing started or ended:** "Active now" is a current fact, so it stays filled. Started and Ended show 0. "Ending this week" shows its real count. The table keeps its rows with Active filled and 0 in Started, Ended, and Net. The empty line is used only when there are no active memberships at all: "No active memberships", with no action.
- **Paging:** only Balance due lists records that can grow without limit. The other tables list products, methods, reasons, or programs, and do not page.
- **The ⋯ menu** on the list and on each report holds Export CSV only. It is absent when Export cannot work: loading, did not load, no data, nothing due, and no permission.

## 2. Added

Row 2 (y = 1080):

- **Reports — list · date range open.** The date button pressed, with a menu: This week, This month (checked), Last month, Last 30 days, Last 90 days.
- **Reports — list · location open.** The Home page's location menu, cloned, under the top-bar location. Bangsar is checked. All locations is the first item.
- **Reports — list · loading.** Report names stay. Figures and changes are grey bars. No footer, no ⋯.
- **Reports — list · did not load.** One line, "Reports did not load. Check your connection and try again.", and Try again. No icon tile, no ⋯.
- **Reports — no permission.** As Farid · Coach. One line, "Your role cannot view reports. Ask an owner for sales and check-ins access." No icon tile, no ⋯.

Row 3 (y = 2160):

- **Reports — Sales · more menu, Export.** ⋯ pressed. The menu holds Export CSV. Figures as in the original (Sales 214).
- **Reports — Sales · exported (toast).** The same page after the download, with the toast "Exported sales, 6 Oct – 4 Nov". Export does not change the page, so only the toast is new. Figures as in the original.
- **Reports — Sales · no data.** One line, "No sales in the last 30 days", and Show last 90 days. The footer sits under it. No ⋯.
- **Reports — Sales · loading.** Total labels stay. Values are grey bars. The chart is its empty baseline. Four skeleton rows. No ⋯, no footer.
- **Reports — Balance due · long list, paged.** 14 sales, 10 on page 1, and the Sales list pager: "1–10 of 14 sales · Bangsar · as of 4 Nov, 09:00". Sale numbers, ages, money, and counts use tabular figures.
- **Reports — Balance due · nothing due.** One line, "No sales have a balance due". No action, no ⋯.
- **Reports — Sales · did not load.** One line, "This report did not load. Check your connection and try again.", and Try again. No ⋯, no footer.

### Numbers

- Sales clones keep the original's figures: product rows add up to RM 41,260.00 and 178 sold; shares add up to 100%; "Sales 214" is kept as in the original (see Conflicts).
- Paged Balance due, page 1: #1012 Priya Nair RM 220.00, #1019 Daniel Wong RM 80.00, #1024 Rachel Goh RM 280.00, #1030 Mei Ling Tan RM 110.00, #1036 Farah Aziz RM 59.00, #1041 Kevin Ong RM 120.00, #1043 Siti Aminah RM 140.00, #1044 Arjun Pillai RM 60.00, #1045 Lim Wei Jie RM 24.00, #1047 Nurul Huda RM 220.00. Sum RM 1,313.00. Ages fall as sale numbers rise.
- Page 2 (not drawn): #1055 Sara Lee, Awaiting payment, RM 150.00; #1058 Hafiz Rahman, Partly paid, RM 150.00; #1061 Mei Ling Tan, Partly paid, RM 230.00; #1062 Chen Yi, Awaiting payment, RM 35.00. Sum RM 565.00. All are today.
- Total RM 1,878.00, 14 sales, oldest 34 days. #1041, #1047, #1055, and #1058 match the original Balance due frame. #1055, #1058, and #1061 match the Sales list and New sale frames. The other numbers are used nowhere else in the file.

## 3. Conflicts

These are in the original frames. I did not change them.

- **Reports — Sales:** "Sales 214" against 178 units in the product rows. The amounts add up to Total sales, so the table covers every sale. The count of sales can never be more than the units sold: a membership or pass sale is one unit, and one ticket sale can buy several spots. So 214 sales with 178 units cannot be true. The "Sold" column could say that it counts spots for tickets.
- **Reports — Program attendance:** the rows hold 78 sessions against "Sessions 186". This is a conflict only if the table lists every program. Also, "Spots booked 78%" does not match the rows: the plain average is about 70%, and the average weighted by sessions is about 69.5%. It can be true only if Yoga Flow and Morning strength have much larger capacity. No-shows 4% matches the rows.

## 4. Needs app or Rails work

The app shows one weekly page. Paper shows a report list and six report pages.
To build Paper, Rails must return:

- **Report list:** one figure per report for the range and location, and the change against the previous period of the same length ("+8%", "No change", "+6 net", "+4 pts").
- **Ranges:** This week, This month, Last month, Last 30 days, Last 90 days, and "Now" for Balance due. Rails today accepts only 1, 2, 4, or 12 weeks.
- **Location scope:** every figure filtered by the top-bar location, and an All locations mode. Rails today always returns all locations.
- **Sales:** daily totals for the bar chart; totals by product (units, amount, share); collected and refunded for the range.
- **Payments by method:** a payment count per method, as well as the amount.
- **Balance due:** each open sale with a balance: sale number, member, payment fact, age, and balance; total, count, and oldest age; paged.
- **Check-ins:** distinct members checked in; counts by hour; denied counts by reason. If the user keeps "Outside access hours", Rails needs that denial reason.
- **Memberships:** active now, started, ended, ending this week, per membership product, and net change.
- **Program attendance:** sessions, share of spots booked, and no-show rate, per program. Rails records attendance, but "no-show" has no definition yet.
- **Export:** one CSV per report, from the ⋯ menu. The app today exports one weekly CSV from a top-bar button.
- **Permission copy:** the app shows the raw failure for a 403. Use the no-permission page text.
- **Error copy:** `FailureNotice` should say "Reports did not load. Check your connection and try again." and offer Try again.
- **Tabular figures:** the original Balance due frame and the amount column of Payments by method lack `tnum`. Build all money, counts, and ages with tabular figures, as in the Sales report.

## 5. Open questions

- **Payment methods:** Payments by method shows Card, E-wallet, and Online (Stripe). The business rules allow Cash and Bank transfer only. Keep them (and add them to Rails), or remove them? Home's "Payments today" has the same question.
- **Denial reasons:** Check-ins shows "Outside access hours". Rails records `no_entitlement`, `location_not_allowed`, and `usage_limit_reached`. Add the reason to Rails, or drop the row? "Not allowed at this location" has no row yet.
- Should Reports split by permission? A front-desk role with `check_ins:read` and no `purchases:read` could see the Check-ins report alone. Today Rails needs both for the whole page.
- Which ranges do you want in the menu? I drew This week, This month, Last month, Last 30 days, and Last 90 days. Is a custom range needed?
- Which options does the Balance due "Now" control offer? No frame shows its menu.
- With "All locations" chosen, the same page shows all locations and the footer says "All locations". No frame shows it. Is that rule enough?
- Export sits alone in the ⋯ menu, as the originals draw ⋯. Should it be a top-bar button, or will ⋯ hold more (for example Print)?
- Should the weekly "New members" figure get a place (for example in Memberships)?
- Page size for Balance due: lists page 50 at a time. I drew 10 rows so the frame fits.

## 6. Not verified

- I did not run the app or open a browser, as the brief says. I read the code only.
- I did not check dark mode in Paper.
- The location menu is a clone of Home's menu and keeps its names: Bangsar, Mont Kiara, Damansara. The brief lists Petaling Jaya instead of Damansara. I followed the original frames.
- Some member names (Siti Aminah, Arjun Pillai, Lim Wei Jie, Chen Yi) are new to the file.
- Home says "RM 180.00 due on #1041" for Mei Ling Tan, but the original Balance due frame gives #1041 to Kevin Ong with RM 120.00. I followed the Balance due original. The Home owner should check.
- In "Reports — Sales · loading", the figure labels sit a little left of their loaded place, because the grey bars are narrower than the values. The build should give each figure a fixed width.

## 7. Review fixes

1. Lock tile on no permission: fixed, removed.
2. Alert tile on list did not load: fixed, removed; spacing now matches the Sales empty and error frames.
3. Sale numbers clashing with the Sales list: fixed. #1049 and #1051 became #1044 and #1045; Nurul Huda #1047 moved below them so ages stay in order. Page 2 now uses #1055, #1058, #1061, and #1062.
4. Payment methods and "Outside access hours" listed as conflicts: fixed, moved to Open questions.
5. Wrong reason for the Sales count conflict: fixed.
6. Export clones showed 178 against 214 in the original: fixed, the clones now show 214.
7. Program attendance conflict: fixed, now conditional on a complete table, with the 78% note.
8. ⋯ kept on list loading and did not load: fixed, removed; the report says ⋯ holds Export only.
9. No tabular figures in the paged list: fixed in my frame; the originals' gap is noted under Needs app or Rails work.
10. No load-error frame for a report page: fixed, added "Reports — Sales · did not load".
11. Check-ins with no denials: fixed, as a rule in "Rules for the other report pages".
12. Export alone in ⋯: not changed; added to Open questions, since the originals draw ⋯.
13. Footer far below the empty line: fixed, it now sits under the line.
14. Loading labels move: not fixed in Paper; noted under Not verified as a build rule (fixed figure widths).
15. Loading frames keep the range and columns: no change needed.
16. "Now" menu and All locations: added to Open questions.

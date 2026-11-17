# Reports — Paper coverage report

Paper page: "Reports" (`p-L-0`). The seven original frames are unchanged.
I added 13 frames in two rows under them. All are clones of an original
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
| Did not load (`FailureNotice`) | Reports — list · did not load | added |
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
| Chart load or metric switch states | none | not designed: Paper has one chart per report, no switch |

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

## 2. Added

Row 2 (y = 1080):

- **Reports — list · date range open.** The date button pressed, with a menu: This week, This month (checked), Last month, Last 30 days, Last 90 days.
- **Reports — list · location open.** The Home page's location menu, cloned, under the top-bar location. Bangsar is checked. All locations is the first item.
- **Reports — list · loading.** Report names stay. Figures and changes are grey bars. No footer.
- **Reports — list · did not load.** The Products load-error pattern: "Reports did not load. Check your connection and try again." and Try again.
- **Reports — no permission.** The Products no-permission pattern, as Farid · Coach. No ⋯ menu. "Your role cannot view reports. Ask an owner for sales and check-ins access."

Row 3 (y = 2160):

- **Reports — Sales · more menu, Export.** ⋯ pressed. The menu holds Export CSV.
- **Reports — Sales · exported (toast).** The same page after the download, with a success toast "Exported sales, 6 Oct – 4 Nov". Export does not change the page, so only the toast is new.
- **Reports — Sales · no data.** One line, "No sales in the last 30 days", and Show last 90 days. The footer keeps the location and range. No ⋯, because there is nothing to export.
- **Reports — Sales · loading.** Total labels stay. Values are grey bars. The chart is its empty baseline. Four skeleton rows. No ⋯ and no footer.
- **Reports — Balance due · long list, paged.** 14 sales, 10 on page 1, and the Sales list pager: "1–10 of 14 sales · Bangsar · as of 4 Nov, 09:00".
- **Reports — Balance due · nothing due.** One line, "No sales have a balance due". No action, no ⋯.

### Checks against "Checks that reviews keep failing"

- Totals agree with rows. In my Sales clones, the product rows add up to RM 41,260.00 and 178 sold. The shares match. I set the "Sales" count to 178 (the original says 214; see Conflicts).
- Paged Balance due: page 1 rows add up to RM 1,313.00. Page 2 holds #1053 Chen Yi RM 45.00, #1055 Sara Lee RM 150.00, #1057 Zul Hakim RM 220.00, and #1058 Hafiz Rahman RM 150.00, which add up to RM 565.00. Total RM 1,878.00, 14 sales, oldest 34 days.
- Loading frames show no loaded figures. The breadcrumb names only the page.
- Empty states are one line and at most one action, with no icon tile.
- Error and permission text do not mention Rails, the API, or a server.
- Export is absent where it cannot work (loading, no data, nothing due, no permission).
- I did not add a chart state, so no new chart style.

## 3. Conflicts

- **Reports — Payments by method** lists Card, E-wallet, and Online (Stripe). The business rules allow Cash and Bank transfer only. Home's "Payments today" has the same problem (Card, Stripe).
- **Reports — Check-ins** lists "Outside access hours" and "No credits left" as denial reasons. Rails records `no_entitlement`, `location_not_allowed`, and `usage_limit_reached`. Rails never produces "Outside access hours". "No credits left" fits `usage_limit_reached`. "Access ended" fits `no_entitlement`. "Not allowed at this location" has no row.
- **Reports — Sales**: "Sales 214" does not match the product rows (178 sold). Each sale has one line, so the two numbers must be equal.
- **Reports — Program attendance**: "Sessions 186" does not match the rows (78 sessions).
- **Reports — Balance due** shows "Awaiting payment" as a payment status. Rails payment facts are Paid, Part paid, Unpaid, and Void. The Sales list frames use the same word. The Sales owner should settle it once.

## 4. Needs app or Rails work

The app shows one weekly page. Paper shows a report list and six report pages.
To build Paper, Rails must return:

- **Report list:** one figure per report for the range and location, and the change against the previous period of the same length ("+8%", "No change", "+6 net", "+4 pts").
- **Ranges:** This week, This month, Last month, Last 30 days, Last 90 days, and "Now" for Balance due. Rails today accepts only 1, 2, 4, or 12 weeks.
- **Location scope:** every figure filtered by the top-bar location, and an All locations mode. Rails today always returns all locations.
- **Sales:** daily totals for the bar chart; totals by product (count, amount, share); collected and refunded for the range.
- **Payments by method:** a payment count per method, as well as the amount.
- **Balance due:** each open sale with a balance: sale number, member, payment fact, age, and balance; total, count, and oldest age; paged.
- **Check-ins:** distinct members checked in; counts by hour; denied counts by reason.
- **Memberships:** active now, started, ended, ending this week, per membership product, and net change.
- **Program attendance:** sessions, share of spots booked, and no-show rate, per program. Rails records attendance, but "no-show" has no definition yet.
- **Export:** one CSV per report, from the ⋯ menu. The app today exports one weekly CSV from a top-bar button.
- **Permission copy:** the app shows the raw failure for a 403. Use the no-permission page text.
- **Error copy:** `FailureNotice` should say "Reports did not load. Check your connection and try again." and offer Try again.

## 5. Open questions

- Should Reports split by permission? A front-desk role with `check_ins:read` and no `purchases:read` could see the Check-ins report alone. Today Rails needs both for the whole page.
- Which ranges do you want in the menu? I drew This week, This month, Last month, Last 30 days, and Last 90 days. Is a custom range needed?
- Should the weekly "New members" figure get a place (for example in Memberships)?
- Payments by method: remove Card, E-wallet, and Online, or are more methods planned?
- Page size for Balance due: lists page 50 at a time. I drew 10 rows so the frame fits.

## 6. Not verified

- I did not run the app or open a browser, as the brief says. I read the code only.
- I did not check dark mode in Paper.
- The location menu is a clone of Home's menu and keeps its names: Bangsar, Mont Kiara, Damansara. The brief lists Petaling Jaya instead of Damansara. I followed the original frames.
- I checked the 13 added frames again after the last edits. None is half-edited.
- Some new member names (Siti Aminah, Arjun Pillai, Lim Wei Jie, Chen Yi, Zul Hakim) are new to the file.

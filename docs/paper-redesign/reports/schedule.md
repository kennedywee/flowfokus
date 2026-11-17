# Schedule and session — Paper report

Pages: "Session details" (`p-D-0`) and a new "Schedule" page (`p-V-0`). The Schedule page sits after "Session details" in the page list. No other page moved.

Wording: the app says "time" or "occurrence". Paper says "session". New frames use "session" everywhere. The app needs the same rename.

The user's three original artboards ("Morning strength, Thu 5 Nov", "Cancel session", "Booking menus") are unchanged. Every new session frame is a clone of the user's session frame, changed only where the state needs it.

## 1. Coverage

### Schedule (`apps/portal/src/routes/$org/schedule/index.tsx`)

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Two weeks of sessions, grouped by day, with "Today, …" | Schedule — Two weeks | added |
| Row: time, program, kind, host | Schedule — Two weeks | added |
| Open session ("11 of 12 booked") | Schedule — Two weeks | added |
| Full session ("Full") | Schedule — Two weeks | added |
| Cancelled session, with reason | Schedule — Two weeks | added |
| Past session ("Ended · 11 of 12 booked") | Schedule — Two weeks; Schedule — Earlier weeks | added |
| Earlier / Later; Today when not on today | Schedule — Two weeks; Schedule — Earlier weeks | added |
| Programs link | Top bar "Programs" button | added |
| Nothing on the schedule | Schedule — Nothing scheduled | added |
| Loading | Schedule — Loading | added |
| Load error | Schedule — Did not load | added |
| Filter by program, no match | Schedule — Filter by program; Schedule — No sessions match | added (not in the app) |
| Filter by location | — | not designed. The location comes from the top bar, as on Home. |

### Session details (`apps/portal/src/routes/$org/schedule/$occurrenceId.tsx`)

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Session with bookings, counts, program link | Session details — Morning strength, Thu 5 Nov | existed |
| Mark present (one or many), undo | Same frame and Session details — Booking menus | existed |
| Booking row menu with Cancel booking… | Session details — Booking menus | existed |
| Cancel session (confirm) | Session details — Cancel session | existed |
| Cancel session, reason required, missing | Session details — Cancel session, with reason (missing) | added |
| Cancel session, reason filled | Session details — Cancel session, with reason (filled) | added |
| Cancel session, nobody booked | Same dialog; only the sentence changes ("Nobody is booked yet.") | not designed (text only) |
| Cancel booking, pass, give the credit back | Dialogs, menus and toasts | added |
| Cancel booking, drop-in, reason missing | Dialogs, menus and toasts | added |
| Book member: choose member | Dialogs, menus and toasts | added |
| Book member: book with a right or sell a ticket | Dialogs, menus and toasts; Session details — Book member over the page | added |
| Ticket for several spots: member and named guests, missing guest name | Dialogs, menus and toasts | added |
| Member has no covering right | Dialogs, menus and toasts (group ticket state) | added |
| Member already booked | Dialogs, menus and toasts | added |
| Session full in the dialog | Dialogs, menus and toasts | added |
| Their passes are loading | Dialogs, menus and toasts | added |
| Their passes did not load | Dialogs, menus and toasts | added |
| The ticket sale was not recorded | Dialogs, menus and toasts | added |
| Role can book but cannot sell | Dialogs, menus and toasts | added |
| Role can sell but cannot book | Dialogs, menus and toasts | added |
| Role can book but cannot cancel the session (no programs:manage) | — | not designed. The top bar ⋯ menu then holds only "Open program". |
| Top bar ⋯ menu | Dialogs, menus and toasts | added |
| Toasts after each action | Dialogs, menus and toasts | added |
| Full session; booking awaiting online payment | Session details — Full, held for online payment | added |
| Booking cancelled by staff, with reason | Session details — Booking cancelled by staff, hold expired | added |
| Hold expired | Session details — Booking cancelled by staff, hold expired | added |
| Cancelled session | Session details — Cancelled session | added |
| Past session | Session details — Ended | added |
| Role with no booking permissions | Session details — View only (no booking permissions) | added |
| No bookings yet | Session details — No bookings | added |
| Loading | Session details — Loading | added |
| Not found | Session details — Did not load | added |
| Network error on the session page | Session details — Did not load, with the line "This session did not load." and a "Try again" button | not designed (copy only) |

## 2. Added

Schedule page (`p-V-0`):

- **Two weeks.** Plain title, Filter, the range with Earlier and Later, one band per day, rows like Home "Up next" and Program details. Programs button in the top bar. Schedule selected in the sidebar, after Programs.
- **Filter by program.** The Sales filter menu, with "Filter…" and Program, and counts per program.
- **No sessions match.** One line and "Clear filters".
- **Earlier weeks.** A past range with Earlier, Today, and Later.
- **Nothing scheduled.** One line and "Add sessions from a program".
- **Loading.** Skeleton band and rows.
- **Did not load.** "The schedule did not load." and "Try again".

Session details page (`p-D-0`):

- **Full, held for online payment.** Status "Full". Capacity "12 spots · 12 booked". A booking awaiting online payment: amber clock, no checkbox, and an "Awaiting payment" chip.
- **Booking cancelled by staff, hold expired.** Status "11 of 12 booked". The Cancelled group is open with two rows: Hafiz Rahman, "Asked to move to Friday · Credit returned", and Meiyi Wong, "Hold expired, payment not received".
- **Cancelled session.** Status "Cancelled", with the reason as its own property. Rows keep the pass or membership chip and say what happened: credit returned, booking cancelled, or refund from the sale.
- **Ended.** No Book member. Attendance can still be marked.
- **View only (no booking permissions).** Coach role. No Book member, no checkboxes, no bulk bar. Rows keep the checkbox space, so the icons line up with the bands.
- **No bookings.** "No bookings yet." and "Book member".
- **Loading.** Skeleton title, rows, and Details. The breadcrumb says "Session".
- **Did not load.** "This session was not found." and "Back to Schedule".
- **Cancel session, with reason (missing / filled).** The user's dialog with a Reason field.
- **Book member over the page.** Step 2 of Book member over the dimmed session page.
- **Dialogs, menus and toasts.** Book member in ten states. Choices are radios and the footer has Cancel and the action, for example "Book with Monthly unlimited" or "Sell 3 × Drop-in · RM 105.00". Also two Cancel booking dialogs in the user's confirm style, the top bar ⋯ menu, and six toasts.

## 3. Conflicts

- **Cancel session needs a reason.** Rails requires a reason to cancel a session. The user's "Cancel session" dialog has no Reason field, so it cannot be submitted under the current rule. Proposed fix: the Reason field in "Cancel session, with reason (missing)" and "(filled)". The original is unchanged.

## 4. Needs app or Rails work

From the user's existing session frames:

- Attendance states "Not marked", "Checked in", and "No-show". Rails has booked and attended only. No-show and undo are missing.
- Bulk select, and bulk "Check in" / "No-show".
- Member numbers (M-0350) and "Guest of Ben Tan" on the row.
- Payment chip on a booking ("Unpaid", "Awaiting payment").
- Row menu: Change payment…, Collect payment, Move to another session…, Open member. Shortcuts A, P, M, ↵.
- Book member as a top bar action with the B shortcut. The app has an inline panel.
- Activity feed and comments on a session.
- Emailing booked members when a session is cancelled.
- "Status" and "Reason" as properties.

From the new frames:

- The session page and breadcrumb sit under Programs › Morning strength in Paper. The app route is under Schedule.
- Schedule filter by program, with counts.
- Schedule shows only the top bar location. The app shows every location.
- "Ended" for past sessions.
- "Try again" on load errors.
- Book member as one dialog with a single choice and a footer action.
- Copy to fix in code: `lib/format.ts` says "The Flowfokus API did not respond. Check that Rails is running, then try again." Staff cannot act on that. Use "Flowfokus did not respond. Try again."
- Rename "time" to "session" in the app.

## 5. Open questions

- The sidebar order: Schedule sits after Programs. Is that right?
- The session page breadcrumb says Programs › Morning strength. Should it say Schedule when staff come from the Schedule?
- Should "Book member" stay a white button, or become the dark primary action?
- After a ticket sale, the app opens the sale page. The toast frame suggests staying on the session. Which do you want?
- Should a gym-site hold say "Awaiting payment", like Sales, or "Awaiting online payment"? Paper now says "Awaiting payment".

## 6. Not verified

- Only the Owner role exists in demo data. The role frames assume the listed permissions.
- Sample counts are illustrative.
- I did not open the app in a browser; the brief forbids it.

## Review fixes

1. Wrapping cancelled status on Earlier weeks: fixed. The status lane is 220px on every Schedule row.
2. Bulk bar over content on Full: fixed. The artboard is taller; the same fix is on Ended.
3. Held booking could be checked in: fixed. No checkbox, an amber clock instead of the attendance mark.
4. View-only icon lane shift: fixed. Rows keep the 24px checkbox space.
5. Activity order on Cancelled session: fixed. The cancel event is newest and on top (06:40).
6. Book member had no footer: fixed. All ten states have Cancel and the action.
7. "Credit returned" on memberships: fixed. Rows keep the pass or membership chip; only the pass row says "Credit returned".
8. Cancel reason only in the feed: fixed. "Reason · Coach unwell" is a property.
9. Bordered notices in the dialog: fixed. Plain 12px lines with a small icon; "Nurul Huda is already booked."
10. No dialog over the page: fixed. "Book member over the page" shows step 2 over the dimmed session page.
11. Empty states differ: fixed. Every empty, no-match, and error state is one plain line and one action, with no icon tile.
12. Status words differ: fixed. The words come from Home and Program details ("11 of 12 booked", "Full", "Cancelled"); the session's count is in Capacity.
13. Filter menu unlike Sales: fixed. It has the "Filter…" field and the Program item.
14. Developer error words: fixed in Paper. The code copy is listed under app work.
15. "Awaiting online payment": fixed. It now says "Awaiting payment", with an open question.
16. Loading showed loaded data: fixed. The breadcrumb says "Session"; the title and Details are skeletons.
17. Cancel session reason: done as a proposed design with missing and filled states; listed under Conflicts.
18. Group ticket: kept; the brief now allows several spots in one ticket sale.
19. View-only sample data: fixed. The Cancelled group and the activity feed match the original.
20. Not found vs network error: the second copy is listed in the coverage table.
21. Sample text: fixed. The toast says "11 bookings cancelled"; "Show 4 earlier events" on the cancelled session.
22. Coverage gaps: staff-cancelled booking, hold expired, passes loading, passes did not load, sale not recorded, book-only role, and sell-only role are added. The desk role without programs:manage is one line in the coverage table.

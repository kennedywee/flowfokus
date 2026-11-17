# Schedule and session — Paper report

Pages: "Session details" (`p-D-0`) and a new "Schedule" page (`p-V-0`). The Schedule page sits after "Session details" in the page list. No other page moved.

Wording: the app says "time" or "occurrence". Paper says "session". New frames use "session" everywhere, including "Cancel session", "This session is full", and "This session did not load". The app needs the same rename.

The user's three original artboards are unchanged.

## 1. Coverage

### Schedule (`apps/portal/src/routes/$org/schedule/index.tsx`)

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Two weeks of sessions, grouped by day, with "Today, …" on the first day | Schedule — Two weeks | added |
| Row: start and end time, program, kind, host | Schedule — Two weeks | added |
| Open session with spots left | Schedule — Two weeks | added |
| Full session | Schedule — Two weeks | added |
| Cancelled session, with its reason | Schedule — Two weeks | added |
| Past session in today's group | Schedule — Two weeks ("Ended · 11 of 12 booked") | added |
| Earlier / Later range buttons | Schedule — Two weeks | added |
| "Today" button when the range is not today | Schedule — Earlier weeks | added |
| Earlier weeks (all past) | Schedule — Earlier weeks | added |
| Programs link | Top bar "Programs" button, every Schedule frame | added |
| Nothing on the schedule | Schedule — Nothing scheduled | added |
| Loading | Schedule — Loading | added |
| Load error | Schedule — Did not load | added |
| Filter by program, with a menu | Schedule — Filter by program | added (not in the app) |
| No match for a filter | Schedule — No sessions match | added (not in the app) |
| Filter by location | — | not designed. The location comes from the top bar, as on Home. |

### Session details (`apps/portal/src/routes/$org/schedule/$occurrenceId.tsx`)

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Session with bookings, counts, program link | Session details — Morning strength, Thu 5 Nov | existed |
| Booked / present / spots left counts | Same frame: group counts and "Capacity" / "Status" properties | existed |
| Mark present (one or many) | Same frame: attendance icon, bulk "Check in" bar; "Booking menus" attendance menu | existed |
| Undo present | "Booking menus": attendance menu, "Not marked" | existed (not in the app) |
| Booking row menu, cancel booking entry | Session details — Booking menus | existed |
| Cancelled bookings group | Same frame: "Cancelled 1" (collapsed) | existed |
| Cancel session (confirm) | Session details — Cancel session | existed |
| Cancel session, reason required, error | Session details — Cancel session, reason missing | added |
| Cancel session, nobody booked | Covered by the same dialog; only the sentence changes ("Nobody is booked yet.") | not designed (text only) |
| Cancel booking, pass, give the credit back | Session details — Dialogs, menus and toasts | added |
| Cancel booking, drop-in ticket, reason missing | Session details — Dialogs, menus and toasts | added |
| Book member: search and choose member | Session details — Dialogs, menus and toasts | added |
| Book member: book with a pass or membership | Session details — Dialogs, menus and toasts | added |
| Sell a ticket for this session: quantity, price | Session details — Dialogs, menus and toasts | added |
| Ticket for a group: members and guests per spot, missing guest name error | Session details — Dialogs, menus and toasts | added |
| Member has no right that covers the session | Session details — Dialogs, menus and toasts | added |
| Member already has a spot | Session details — Dialogs, menus and toasts | added |
| Session full in the book dialog; "Not booked" error | Session details — Dialogs, menus and toasts | added |
| Top bar ⋯ menu: Open program, Cancel session… | Session details — Dialogs, menus and toasts | added |
| Toasts: checked in, booked, booking cancelled, session cancelled, ticket sale recorded, error | Session details — Dialogs, menus and toasts | added |
| Full session | Session details — Full, held for online payment | added |
| Booking held for online payment | Same frame: "Awaiting online payment" chip on Mei Ling Tan | added |
| Cancelled session | Session details — Cancelled session | added |
| Expanded cancelled bookings | Session details — Cancelled session (uses the hidden row already in the user's frame) | added |
| Past session | Session details — Ended | added |
| Role that cannot book or manage | Session details — View only (no booking permissions) | added |
| No bookings yet | Session details — No bookings | added |
| Loading | Session details — Loading | added |
| Not found / did not load | Session details — Did not load | added |
| Every booking cancelled, open session | — | not designed. It is "Cancelled session" with the open status and Book member. |

## 2. Added

Schedule page (`p-V-0`):

- **Schedule — Two weeks.** Plain title, Filter, the range ("Thu 5 Nov – Wed 18 Nov") with Earlier and Later. One band per day ("Today, Thursday 5 November", "4 sessions"). Rows copy Home's "Up next" and Program details: time, program, "Group class · Daniel Wong", then "11 of 12 booked" with a pie, "Full" with an amber dot, or "Cancelled · Coach unwell" with a red mark. A past session today reads "Ended · 11 of 12 booked" in grey. Programs button in the top bar. Schedule is selected in the sidebar.
- **Schedule — Filter by program.** The Sales filter pattern: chip "Program is Morning strength" and the Program menu with counts.
- **Schedule — No sessions match.** One line and "Clear filters".
- **Schedule — Earlier weeks.** A past range. Earlier, Today, and Later. Every row ended or cancelled.
- **Schedule — Nothing scheduled.** One line and "Add sessions from a program".
- **Schedule — Loading.** Skeleton band and rows.
- **Schedule — Did not load.** Error mark, the API message, and "Try again".

Session details page (`p-D-0`). Each frame is a clone of the user's session frame:

- **Full, held for online payment.** Status "Full · 12 of 12". A twelfth booking with an "Awaiting online payment" chip.
- **Cancelled session.** No Book member and no bulk bar. Status "Cancelled". The Cancelled group is open, with "Session cancelled" rows, "Credit returned" chips, and "Drop-in stays on its sale" for the guest. Activity starts with "Kennedy cancelled this session · Coach unwell".
- **Ended.** No Book member. Status "Ended". Attendance can still be marked, as in the app.
- **View only (no booking permissions).** Staff user "Aina · Coach". No Book member, no checkboxes, no bulk bar.
- **No bookings.** "No bookings yet" and "Book member".
- **Loading** and **Did not load.**
- **Cancel session, reason missing.** The user's dialog with a required Reason field and its error.
- **Dialogs, menus and toasts.** Book member flow (five states), two Cancel booking dialogs in the user's confirm-dialog style, the top bar ⋯ menu, and six toasts.

## 3. Conflicts

None. Every fact in the existing frames can be true under the business rules.

## 4. Needs app or Rails work

From the user's existing session frames:

- Attendance states "Not marked", "Checked in", and "No-show". Rails has booked and attended only. No-show and undo are missing.
- Bulk select and bulk "Check in" / "No-show".
- Member numbers (M-0350) and "Guest of Ben Tan" on the row. Rails has the holder name, not a number.
- Payment chip on a booking ("Unpaid").
- Row menu: Change payment…, Collect payment, Move to another session…, Open member. Shortcuts A, P, M, ↵.
- Book member as a top bar action with the B shortcut. The app has an inline panel.
- Activity feed and comments on a session.
- Emailing booked members when a session is cancelled ("The 11 booked members get an email").
- "Status: Scheduled" as a property.

From the new frames:

- The session page and breadcrumb live under Programs › Morning strength in Paper. The app route is under Schedule.
- Schedule filter by program, with counts, and its no-match state.
- Schedule shows only the top bar location. The app shows every location.
- "Ended" for past sessions in the schedule and on the session page.
- "Try again" on load errors.
- The book dialog's group-ticket rows reuse today's app fields. The dialog itself, the top bar ⋯ menu, and the "Ticket sale recorded" toast as a toast that stays on the session are new layouts.
- Rename "time" to "session" in the app.

## 5. Open questions

- Sidebar: Schedule sits after Programs (Home, Members, Sales, Check-ins, Programs, Schedule, Products, Reports). Is that the order you want?
- The session page breadcrumb says Programs › Morning strength. Should it say Schedule when staff come from the Schedule?
- Should the session page keep "Book member" as a white button, or make it the dark primary action?
- After a ticket sale, the app opens the sale page. The toast frame suggests staying on the session. Which do you want?
- Should a coach role see the roster at all, or only Home's "Up next"?

## 6. Not verified

- Only the Owner role exists in demo data. The view-only frame assumes a role without bookings:create, bookings:manage, purchases:create, and programs:manage.
- Sample counts (for example "8" per program) are illustrative.
- I did not open the app in a browser; the brief forbids it. Every state comes from reading the code.

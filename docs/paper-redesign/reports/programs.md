# Programs report

Pages: Programs (`p-9-0`), Program details (`p-A-0`), New program (`p-B-0`),
Booking rules & settings (`p-C-0`). Code read: `routes/$org/programs/index.tsx`,
`routes/$org/programs/$programId.tsx`, `components/ProgramDialogs.tsx`,
`components/PriceActions.tsx`, `lib/staff.functions.ts`, `packages/api/src/schema.d.ts`,
and Rails `Staff::ProgramsController`.

The original frames are the target. Every new frame is a clone of an original,
changed only where the state needs it. I removed my earlier redrawn
"(app facts)", "(app fields)", and "(app actions)" frames.

Wording decision: Paper says "session"; the app says "time" (Add times, Coming
times). Paper's "session" wins. The app will be renamed.

## 1. Coverage

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Programs list | Programs — list | existed |
| Programs list, no programs:manage | Programs — without programs:manage | added |
| Programs loading | Programs — Loading | added |
| Programs did not load | Programs — Did not load | added |
| Search with no match (Paper's search) | Programs — No results | added |
| No programs yet, manager | Programs — No programs yet | existed |
| No programs yet, no programs:manage | Programs — No programs yet, without programs:manage | added |
| Program page | Program details — Morning strength | existed |
| Cancelled session with reason | Program details — Morning strength | existed |
| Session that ended earlier today | Program details — Ticket price menu (first row) | added |
| Price not on sale, price archived | Program details — Ticket price menu (Tickets) | added |
| Program page, no programs:manage | Program details — without programs:manage | added |
| No coming sessions, no ticket prices, no products | Program details — No sessions, no ticket prices | added |
| Price menu: Put on sale / Take off sale, Archive | Program details — Ticket price menu | added |
| Archive price confirm | Program details — Archive price | added |
| Add ticket price with errors | Program details — New ticket, invalid | added |
| Add sessions dialog | Program details — Add sessions | existed |
| Add sessions failed | Program details — Add sessions, not added | added |
| Add ticket price failed ("The ticket price was not added") | Program details — New ticket, not added | added |
| Sessions added toast | Program details — Sessions added (toast) | added |
| Program not found | Program details — Not found | added |
| Program did not load | Program details — Did not load | added |
| Edit failed / saving | — | not drawn: "Edit program — host changed" with the "Not saved" notice titled "The changes were not saved", and "Saving…" dimmed as in "New program — Creating" |
| Program page loading | Program details — Loading | added |
| New program form, kinds, ticket dialog, discard, created, published | New program — 1 to 9 | existed |
| Missing name, no days | New program — 6 · Missing details | existed |
| Spots outside 1–10000 | New program — Spots out of range | added |
| Create failed on the server | New program — Not saved | added |
| Create in progress | New program — Creating | added |
| Edit program | Edit program — host changed | existed |
| Publish and unpublish | 5 · More actions — publish, duplicate, archive (p-C-0) | existed; no second way added |

## 2. Added

Programs (`p-9-0`), clones of "Programs — list" or "No programs yet":
- **without programs:manage:** no New program, no ⋯. Role "Front desk".
- **Loading:** toolbar and header band stay; four skeleton rows in the original columns.
- **Did not load:** one line, "Flowfokus did not respond. Try again in a moment.", and Try again.
- **No results:** search holds "kettlebell" with the "/" hint; the Sales no-results block: search tile, one line, Clear search.
- **No programs yet, without programs:manage:** no New program, no ⋯; "A manager adds programs."

Program details (`p-A-0`), clones of "Morning strength", "Add sessions", "Sell ticket", and the New sale confirm:
- **without programs:manage:** no Add sessions, no ⋯, no + on Tickets. Sell ticket and Book member stay.
- **No sessions, no ticket prices:** top bar has Search, Add sessions, ⋯ only (no Sell ticket, no Book member). "Sessions 0" and one line "No coming sessions"; "No ticket prices"; "None yet"; one activity event.
- **Ticket price menu:** ticket rows Drop-in, Early bird (Archived, grey archive mark), Member guest (Off sale, grey mark) with ⋯ open below it: Put on sale, Archive price…. The menu covers no ticket row. The first session row reads "Ended · 11 of 12 booked".
- **Archive price:** the New sale confirm dialog (440px, no header, no close): "Archive Member guest?", "It can never go back on sale. Past sales keep this price.", Cancel and red "Archive price".
- **New ticket, invalid:** the original New ticket dialog. "Enter a name, for example Drop-in." and "Enter a price, like 25.50." on one line each.
- **New ticket, not added:** the same dialog with a notice: "The ticket price was not added · Flowfokus did not respond. Try again in a moment."
- **Add sessions, not added:** the original Add sessions dialog with "No sessions were added" and the same staff sentence.
- **Sessions added (toast):** the page after the action. Band "Sessions 24", new Tue 10 Nov and Tue 17 Nov rows at 0 of 12 booked, subtitle "Every Mon, Tue, Wed, Thu and Fri", feed event "Kennedy added 4 sessions · Tuesdays, 07:00 · Just now", toast "4 sessions added · Each session has 12 spots."
- **Loading:** window, sidebar, top bar with Search only and no program name; skeletons for the tile, title, subtitle, Sessions band, five rows, and the properties column.
- **Not found** and **Did not load:** one line and one action. Did not load uses the staff sentence.

New program (`p-B-0`), clones of "2 · Group class":
- **Not saved:** notice "The program was not saved · Flowfokus did not respond. Try again in a moment. Your details are kept."
- **Creating:** top bar button "Creating…", dimmed.
- **Spots out of range:** Spots "0" with "Enter 1 to 10,000." on one line.

Real facts added inside the original design: ended session, price off sale, price archived.

New pattern for other pages: a form-level notice (bordered box, 16px red icon, title, one staff sentence). Used in Not saved, Add sessions not added, and New ticket not added.

Pending labels: "Creating…" (New program), "Saving…" (Edit), "Adding…" (Add sessions, New ticket), "Archiving…" (Archive price). All dim the action button as in "New program — Creating".

Toast copy (all in the Sale details toast style, each frame shows the result on the page): "Program saved" · "4 sessions added" (or "Sessions that already existed were skipped.") · "Ticket price added — Drop-in is on sale for Morning strength." · "Price taken off sale" / "Price on sale again" · "Price archived — Past sales keep it." · Error: "The price did not change".

## 3. Conflicts

- **Exploration — Tickets in main content** and **New program — 5 · Add ticket:** "All sessions", "Pack", and "Full course · All 12 sessions" tickets. The rule is one ticket, one session time. A ticket that covers many sessions breaks it.
- My frame "Program details — New ticket, invalid" (and "New ticket, not added") copies these Covers options from the original dialog. They change with the user's decision.

## 4. Needs app or Rails work (build list)

Programs list:
- Filter, Display, search ("Search programs or hosts"), sort, and the pager.
- Next session with booked count per program; Upcoming count is in Rails, next session is not.
- Several hosts per program with avatars. Rails stores one free-text host.
- Kind icon tiles and the Staff only mark per row (data exists).

Program page:
- Subtitle with the weekly pattern ("Every Mon, Wed, Thu and Fri"). Rails has no recurrence rule.
- Activity feed with comments, filters, and events (session added, cancelled). Rails has no program activity or comments.
- Sell ticket and Book member from the program page (Rails supports them on the session; the app has them only there).
- ⋯ menu: Publish, Edit program, Duplicate, Cancel a session…, Archive program. Rails has publish (PATCH `published`) and edit. Duplicate and archive program are missing.
- Click-to-edit properties (capacity popover) and pass credits per program (p-C-0). Rails has no credits per booking.
- Key hints T, S, B, ⇧P need shortcuts in the app.
- Ended state: the app must compare `ends_at` with now; Rails returns today's ended times.
- Price menu actions exist in Rails (update `available`, archive). Try again on load errors is app work.

Copy to fix in code (developer wording shown to staff today):
- "The Flowfokus API did not respond. Check that Rails is running, then try again." → "Flowfokus did not respond. Try again in a moment."
- "Spots must be a whole number from 1 to 10000." → "Enter 1 to 10,000."
- "Enter an amount, for example 25 or 25.50." → "Enter a price, like 25.50."
- "Not on sale" → "Off sale" in the ticket row.

New program:
- The full page instead of a dialog, with discard guard.
- Host as a staff picker (Rails: free text).
- Schedule section in the create flow: days, start, from, until, specific dates. Rails takes first date, time, and 1–26 weeks per call.
- Tickets section in the create flow; ticket fields Covers, Who can buy, Sell online. Rails ticket price is label and amount.
- Note in properties: map to Rails `description`.
- Created toast with Publish; Published toast with View on site.

## 5. Open questions

- Should a ticket ever cover more than one session (see Conflicts)?
- One create call or a chain (program, sessions, tickets)? What happens when a later step fails?
- Is the program list per organization (Rails today) or per breadcrumb location?
- Should archived prices stay listed on the program page, or fold away?
- Field errors: with a small icon (brief, "New sale — error") or red text only ("6 · Missing details")? Both now sit on the New program page.

## 6. Not verified

- I did not run the app. States come from reading code.
- Program list ⋯ contents for Front desk; I removed ⋯ on the no-manage list frames on the assumption it holds manage actions only.
- 403 wording on the program page ("Your role does not allow this action.") is not drawn.
- Phone layouts are not designed.
- The location error "Choose where it happens." appears only when an organization has no locations; not drawn.

## Review fixes

1. No sessions: Book member removed from the top bar — fixed.
2. Toast frame shows the result (count 24, two new rows, new event, new subtitle) — fixed.
3. Archive price uses the New sale confirm dialog (440px, no header) — fixed.
4. No results matches Sales: search tile and "/" hint — fixed.
5. Error text on all four frames is a staff sentence; developer wording listed as copy to fix — fixed.
6. Price menu: Off sale and Archived have grey status marks; menu no longer covers a ticket row — fixed.
7. No sessions: inline Add sessions removed; one plain line — fixed.
8. Spots error is an instruction on one line ("Enter 1 to 10,000.") — fixed (shortened to fit the 140px column).
9. Price error on one line ("Enter a price, like 25.50.") — fixed.
10. Program page loading drawn — fixed.
11. "The ticket price was not added" drawn and in the table — fixed.
12. ⋯ removed on the two no-manage list frames — fixed; contents still to confirm.
13. "A manager adds programs." kept — no change, as the review suggests.
14. New ticket Covers options follow the open conflict — noted in Conflicts.
15. Form-level notice recorded as a new pattern — done in Added.
16. Field error icon vs red text — open question for the user.
17. Edit failed and saving rules written in the coverage table — done.
18. Pending labels named — done in Added.
19. Raw key-hint colours come from the originals — no change.

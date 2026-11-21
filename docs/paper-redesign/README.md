# Paper redesign: where things stand

Every screen and state of the staff portal now has a design in the Paper file
"Flowfokus Redesign". The app is built from Paper next. Paper is the target:
where Paper and the app differ, the app changes.

- `brief.md` holds the rules every design agent followed.
- `reports/` has one report per set: coverage, what was added, conflicts, the
  build list ("Needs app or Rails work"), and open questions.
- `rails-gaps.md` links to the GitHub issues for what Paper shows and Rails
  cannot supply yet. The issues are the input for the Rails work.
- `reviews/` has the independent review of each set. Each report ends with a
  "Review fixes" section that answers its review.

## Sets

| Set | Paper pages | Report |
| --- | --- | --- |
| Home and app chrome, the ten-item sidebar, dark frame. **Home removed 21 Nov 2026.** | Home | `reports/home.md` |
| Inbox and Agents. **Removed 21 Nov 2026.** | Inbox, Agents | `reports/inbox-agents.md` |
| Members and Sales states | Members, Member details, New member, Sales, Sale details, New sale | `reports/members-sales.md` |
| Check-ins. **Page removed 21 Nov 2026.** Check-in stays on the member page and ⌘K. | Check-ins | `reports/check-ins.md` |
| Schedule (new page) and sessions | Schedule, Session details | `reports/schedule.md` |
| Programs | Programs, Program details, New program, Booking rules & settings | `reports/programs.md` |
| Products, with an "Option B" block for the Rails model | Products | `reports/products.md` |
| Reports. **Removed 21 Nov 2026.** | Reports | `reports/reports.md` |
| Settings and sign-in | Settings & sign-in | `reports/settings.md` |
| Phone and tablet layouts | Narrow screens | `reports/phone.md` |
| Sidebar on every desktop frame | all desktop pages | `reports/sidebar-a.md`, `reports/sidebar-b.md` |

The removed sets are kept as history. The portal no longer builds them. See
[Decisions](../decisions.md). The Rails gaps of a removed set are not work to do.

The user's original frames were not changed, with one exception the user
asked for: the list of pages inside the sidebar now has ten items on every
desktop frame.

## Settled

- Sidebar (decided 21 Nov 2026, replaces the ten-item list of this pass):
  Calendar, Members, Sales, Programs, Products. Home, Inbox, Agents, Check-ins,
  and Reports are removed. Until Calendar is built, the sidebar has Schedule.
- "Fulfill", "Fulfilled", "Unfulfilled". Never "Deliver". The shortcut is F.
- "Session", not "time". "New program", not "Add program".
- Page actions sit in the top bar. On phones they sit under the title, and
  full-page create forms use a bar at the bottom with no tab bar.
- A ticket sale can buy several spots in one session.
- Figtree only, with tabular figures for numbers.
- Design system (decided 18 Nov 2026):
  - Two font weights: 400 for body text, 500 for headings and emphasis.
  - Greys come from the Tailwind CSS neutral palette. Paper tokens:
    `--muted` neutral-50, `--accent` neutral-100, `--border` neutral-200,
    `--subtle-foreground` neutral-500 (field borders, 3:1), `--muted-foreground`
    neutral-600, `--foreground` and `--primary` neutral-800.
  - Radius is 8px for controls and 12px for floating surfaces (menus, dialogs,
    toasts, panels, cards). Exceptions: circles keep their shape, and
    checkboxes and square tiles under 20px (org tile, small logos) use 4px.
  - Progress bars are solid by default: a `--muted-foreground` fill on a
    `--border` track, pill ends, a sharp edge at the exact value. A dotted
    pattern is an optional variant for credit and pass bars.
  - Dark theme: the window is neutral-900 on a neutral-950 canvas.
  - Icons: Hugeicons Solid is the wish, but it needs a Pro licence. Icons stay
    as they are until the owner decides.
- Layout (decided 18 Nov 2026): all page content shares one left edge with the
  title. Grey bands and table headers do not hang outside the column; their
  text sits 12px inside, and rows below have 12px side padding to match.
- Every data table uses the standard toolbar: Filter and filter chips on the
  left, Search and Display on the right. Clicking a chip's operator toggles
  "is" ↔ "is not" ("is any of" ↔ "is none of").
- Toasts stack in the Sonner model: newest in front, at most 3 visible, hover
  expands, 4s, errors stay until closed, bottom right (24px in), 440px wide.
- The Paper file starts with three component pages: Components — Core,
  Components — Complex, Components — Data. They are the reference for parts.
- Product model (decided 18 Nov 2026): Paper's surface on Rails' model. Staff
  see one price per product. Underneath it stays a Rails fixed price. Changing
  the price creates a new price, so members keep the price they paid.
- Roles (decided 18 Nov 2026): the app's three roles for now: Owner, Manager,
  Receptionist. Coach and the "Front desk" name wait for WorkOS and Rails work.
- Sign-in (decided 18 Nov 2026): the WorkOS sign-in page, not a form in the
  portal. Passwords never reach our app.
- Reports (decided 21 Nov 2026): removed from the product. The 18 Nov 2026
  decision to build them with their Rails endpoints no longer applies.

## Decisions the user still owes

Each decision is a GitHub issue. Its report explains the detail. Until they are
decided, the frames follow Paper. The numbers 4 to 10 are the names the reports
use.

| No. | Decision | Issue |
| --- | --- | --- |
| 4 | Card, e-wallet, and online payments | [#9](https://github.com/kennedywee/flowfokus/issues/9) |
| 5 | Tickets that cover several sessions | [#10](https://github.com/kennedywee/flowfokus/issues/10) |
| 6 | Check-in rules: access hours, walk-ins, bookings as access | [#11](https://github.com/kennedywee/flowfokus/issues/11) |
| 7 | A reason for Cancel session, and "Also end access" on Refund | [#12](https://github.com/kennedywee/flowfokus/issues/12) |
| 8 | Email required or optional on New member | [#13](https://github.com/kennedywee/flowfokus/issues/13) |
| 9 | Status words for sales and access | [#14](https://github.com/kennedywee/flowfokus/issues/14) |
| 10 | Slips in the original frames | [#15](https://github.com/kennedywee/flowfokus/issues/15) |
| | The Hugeicons Pro licence | [#16](https://github.com/kennedywee/flowfokus/issues/16) |

When a decision is made, record it under "Settled" and close its issue.

## Building from this

Take one set at a time. Read its report first: the coverage table maps each
real state to a Paper artboard, and "Needs app or Rails work" is the build
list. Error text in the app that mentions Rails or permission codes is listed
in the reports as copy to fix.

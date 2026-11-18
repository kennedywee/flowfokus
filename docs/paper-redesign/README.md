# Paper redesign: where things stand

Every screen and state of the staff portal now has a design in the Paper file
"Flowfokus Redesign". The app is built from Paper next. Paper is the target:
where Paper and the app differ, the app changes.

- `brief.md` holds the rules every design agent followed.
- `reports/` has one report per set: coverage, what was added, conflicts, the
  build list ("Needs app or Rails work"), and open questions.
- `rails-gaps.md` lists what Paper shows and Rails cannot supply yet. It is
  the input for the Rails work.
- `reviews/` has the independent review of each set. Each report ends with a
  "Review fixes" section that answers its review.

## Sets

| Set | Paper pages | Report |
| --- | --- | --- |
| Home and app chrome, the ten-item sidebar, dark frame | Home | `reports/home.md` |
| Inbox and Agents (new pages, sample data) | Inbox, Agents | `reports/inbox-agents.md` |
| Members and Sales states | Members, Member details, New member, Sales, Sale details, New sale | `reports/members-sales.md` |
| Check-ins | Check-ins | `reports/check-ins.md` |
| Schedule (new page) and sessions | Schedule, Session details | `reports/schedule.md` |
| Programs | Programs, Program details, New program, Booking rules & settings | `reports/programs.md` |
| Products, with an "Option B" block for the Rails model | Products | `reports/products.md` |
| Reports | Reports | `reports/reports.md` |
| Settings and sign-in | Settings & sign-in | `reports/settings.md` |
| Phone and tablet layouts | Narrow screens | `reports/phone.md` |
| Sidebar on every desktop frame | all desktop pages | `reports/sidebar-a.md`, `reports/sidebar-b.md` |

The user's original frames were not changed, with one exception the user
asked for: the list of pages inside the sidebar now has ten items on every
desktop frame.

## Settled

- Paper's page names: Home, Check-ins, Products. The app is renamed to match.
- Sidebar order: Home, Inbox, Agents, Members, Sales, Check-ins, Schedule,
  Programs, Products, Reports.
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
    toasts, panels, cards). Only circles and 16px checkboxes (4px) differ.
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
- Reports (decided 18 Nov 2026): not rebuilt in the portal-only pass. Build the
  report list and pages together with their Rails endpoints.

## Decisions the user still owes

Each report explains its items. Until they are decided, the frames follow Paper.

4. **Card, e-wallet, and online payments.** In the design or not.
   (`reports/home.md`, `reports/reports.md`)
5. **Tickets that cover several sessions** ("All sessions", "Pack").
   (`reports/programs.md`)
6. **Check-in rules:** off-peak hours, walk-ins, and a booking counting as
   access. (`reports/check-ins.md`)
7. **Cancel session needs a reason** (proposed frame beside the original), and
   "Also end access" on Refund. (`reports/schedule.md`, `reports/members-sales.md`)
8. **Email** required or optional on New member. Rails requires it.
   (`reports/members-sales.md`)
9. **Status words.** "Partly paid", "Awaiting payment", "Access ended" (Paper)
   or "Part paid", "Unpaid", "Access revoked" (app). The originals also
   disagree with each other in places. (`reports/members-sales.md`)
10. **Slips in original frames:** two Reports totals that do not add up, two
    Products frames that sit on top of each other, a Product details feed out
    of time order, and statuses drawn with two dot colours.
    (`reports/reports.md`, `reports/products.md`, `reviews/phone.md`)

## Building from this

Take one set at a time. Read its report first: the coverage table maps each
real state to a Paper artboard, and "Needs app or Rails work" is the build
list. Error text in the app that mentions Rails or permission codes is listed
in the reports as copy to fix.

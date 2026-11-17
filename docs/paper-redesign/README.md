# Paper redesign: where things stand

Every screen and state of the staff portal now has a design in the Paper file
"Flowfokus Redesign". The app is built from Paper next. Paper is the target:
where Paper and the app differ, the app changes.

- `brief.md` holds the rules every design agent followed.
- `reports/` has one report per set: coverage, what was added, conflicts, the
  build list ("Needs app or Rails work"), and open questions.
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

## Decisions the user still owes

Each report explains its items. Until they are decided, the frames follow Paper.

1. **Product model.** One price per product (Paper) or several fixed prices
   and benefits (Rails). Recommended: Paper's surface on Rails' fixed prices.
   Also: do renewing members move to a new price or keep the one they paid?
   (`reports/products.md`)
2. **Role model.** Owner, Manager, Front desk, Coach (Paper) or Owner,
   Manager, Receptionist (app). Can a Manager manage staff? (`reports/settings.md`)
3. **Sign-in.** A form in the portal (Paper) or the identity provider's page
   (app). (`reports/settings.md`)
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

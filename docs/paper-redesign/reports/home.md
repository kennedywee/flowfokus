# Home and app chrome — Paper report

Page: "Home" (`p-K-0`) in "Flowfokus Redesign". I did not change any existing
artboard. Every new frame starts from "Home — Today" (or a copy of one of my
copies of it) and uses the new sidebar.

## Layout on the page

- Row 1 (y 0): the user's frames, unchanged.
- Row 2 (y 1200): sidebar, then the Home states.
- Row 3 (y 2400): menus, ⌘K, account menu, toasts, and a sheet of small states.
- Row 4 (y 3600): collapsed sidebar, dark theme, What's new, not built yet.

## Sidebar with all pages

Artboard "App — Sidebar with all pages". **Clone the sidebar node `1IXF-0`**
("Sidebar · All pages") to apply it to other frames.

Order, ten items:

1. Home
2. Inbox
3. Agents
4. Members
5. Sales
6. Check-ins
7. Schedule
8. Programs
9. Products
10. Reports

Why: Paper's seven items keep their order. Inbox and Agents sit under Home,
because they are daily desk work and the app puts them there. Schedule sits
between Check-ins and Programs: it is about time, and it shows the sessions that
programs create. The three new rows use the same 32px row, 16px icon, 13px
label, and selected fill as the others. Icons: inbox tray, bot, calendar with
day dots (Programs keeps its calendar with a check).

All my new frames use this sidebar. Existing frames still have the seven-item
sidebar, for the later pass.

## 1. Coverage

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Overview, normal day | Home — Today | existed |
| Overview, first organization setup | Home — First run | existed |
| Overview, loading (`SkeletonRows`) | Home — Loading | added |
| Overview, a list or the counts fail to load | Home — Load error | added |
| Overview, role that cannot sell (no `purchases:create`) | Home — Receptionist (cannot sell) | added |
| Overview, nothing today (no sessions, nothing due, zero counts) | Home — Quiet day | added |
| Overview, no members yet / no check-ins yet | Home — First run ("Add a member") | existed |
| Overview, New sale action | Home — Today ("Sell S" in the top bar) | existed |
| Overview, check-in panel (member, location, result, Let in anyway, next steps) | — | not designed: Paper's Home opens check-in from the top bar "Check in C". That flow is owned by the Check-ins and Member details pages. |
| Overview, recent check-ins list and the four counts | Home — Today properties ("Today" group) | existed (Paper's design) |
| Sidebar, full list | App — Sidebar with all pages | added |
| Sidebar, collapsed rail | App — Collapsed sidebar | added |
| Organization switcher, several organizations | App — Organization switcher | added |
| Organization switcher, one organization (demo mode) | App — Menus and top bar states | added |
| Organization switcher, no match | App — Menus and top bar states | added |
| Location switcher, open | App — Location switcher | existed |
| Location switcher, no match | App — Menus and top bar states | added |
| Top bar, no locations ("No locations") | App — Menus and top bar states | added |
| Top bar, no page actions | App — Menus and top bar states | added |
| Top bar, one primary action | App — Menus and top bar states (New sale page, "Create sale") | added |
| Top bar, several actions and ⋯ | Home — Today; also on the sheet | existed |
| ⌘K, member results | App — ⌘K command menu | existed |
| ⌘K, searching | App — ⌘K searching | added |
| ⌘K, no results | App — ⌘K no results | added |
| ⌘K, role without `members:read` ("Search pages…", pages only) | App — ⌘K without members:read | added |
| ⌘K, member search failed | — | not designed: same status line as "no results", with the failure text. |
| Account menu, open | Member details — Priya Nair (`DNR-0`) | existed |
| Account menu, Theme choice (Light, Dark, System) | App — Account menu, Theme | added |
| Toasts: success, info, error | App — Toasts | added |
| Dark theme | App — Dark theme | added |
| What's new (sample data) | What's new — Sample data | added |
| Not built yet page | Not built yet — Inbox | added |
| Sign-in, settings | — | not designed: owned by "Settings & sign-in" |

## 2. Added

- **App — Sidebar with all pages.** Home — Today with the ten-item sidebar.
  Canonical sidebar node `1IXF-0`.
- **Home — Loading.** Same bands and title. Rows, band counts, and the
  properties values are grey skeleton bars. "View all" and Payments today are
  hidden until data arrives.
- **Home — Load error.** Each list shows one row: a red 16px icon, "Sessions did
  not load" / "Needs attention did not load", the failure text, and "Try again".
  The properties column shows "Counts did not load". The rest of the page stays.
- **Home — Receptionist (cannot sell).** No "Sell S" in the top bar. No money in
  the properties (Sales, Collected, and Payments today are gone). Footer reads
  "Nadia · Receptionist".
- **Home — Quiet day.** "No more sessions today." with "Open schedule →".
  "Nothing needs attention." Properties show zeros and "No sessions". Payments
  today is hidden when nothing was paid.
- **App — Organization switcher.** The location menu's design (260px, 32px rows,
  search on top) with organizations: a letter tile, the name, the role on the
  right, a check on the open one.
- **App — ⌘K searching / no results / without members:read.** The existing ⌘K
  dialog. Searching shows a skeleton row and "Searching members…". No results
  shows "Nothing matches “zzq”." Without `members:read` the placeholder is
  "Search pages…" and only the Pages group shows.
- **App — Account menu, Theme.** The account menu from Member details, plus one
  row: "Theme · System ›", with a submenu: Light, Dark, System (checked).
- **App — Toasts.** Paper's toast (40px, 14px filled icon, one line) in three
  tones, stacked at the bottom centre: info (blue), error (red), success (green).
  The detail follows a "·" in grey.
- **App — Menus and top bar states.** A sheet, not a full frame: organization
  menu with one organization, organization no match, location no match, and four
  top bars (no actions; one primary action; several actions and ⋯; no
  locations).
- **App — Collapsed sidebar.** The 56px rail: logo, ten icons, the selected fill
  on Home, and the avatar. The logo is the expand button.
- **App — Dark theme.** Home — Today in dark. **This is the one frame with raw
  hex**, because the file has no dark tokens: page and surface #101011, well
  #19191B, hover #1F1F22, line #26262A, text #F2F2EE, secondary text #A3A3AA,
  marks #5C5C63.
- **What's new — Sample data.** Title with a "Sample data" mark, no page
  actions. One band per release (title, then "Preview · 21 Oct 2026"), one plain
  line, then rows with a small green check.
- **Not built yet — Inbox.** The section's title and icon, one line "Inbox is
  not available yet.", and "Back to Home →". The sidebar item is selected.

## 3. Conflicts

- **Home — Today, "Payments today": Card RM 270.00 and Stripe RM 280.00.** The
  only payment methods are Cash and Bank transfer. My new frames show only Cash
  and Bank transfer.

## 4. Needs app or Rails work

Home (Paper's design differs from the current Overview):

- Up next: today's sessions with time, type, trainer, booking fill, and
  "View all 9 sessions". Needs a sessions-for-today feed.
- Needs attention: count of sales with a balance due and the total due, the
  oldest sale and its age; count of unfulfilled sales with names; memberships
  that end this week. Rails has `unpaid_sale_count` and
  `awaiting_fulfillment_count` only.
- Today properties: sales total and count, collected, new members, bookings
  ("58 of 96 spots"). Payments today by method.
- Sale numbers (#1041). Rails has no sale numbers.
- Page title "Today" with the date and desk location.
- Top bar "Check in (C)" and "Sell (S)" on Home, with ⋯. The app has New sale
  and no shortcuts on Overview. Hide Sell without `purchases:create`; the app
  shows New sale to every role today.
- "Try again" on a failed list. The app shows a notice with no retry.
- Quiet day: "Open schedule" link; hide Payments today when nothing was paid.
- First run checklist (existing frame): needs setup progress from Rails.

Chrome:

- Sidebar: rename to Paper's names (Home, Check-ins, Products) and use the
  ten-item order above.
- Organization switcher: show the role on the right in one row (the app shows
  it as a second line).
- Location switcher (existing frame): "All locations" and "Manage locations".
  The app has neither; it has "Add location".
- ⌘K (existing frame): member numbers (M-0412) and an Actions group ("Check in
  Priya Nair C", "New sale for Priya Nair S"). The app shows name and email,
  and a Pages group.
- Account menu (existing frame): Profile, Keyboard shortcuts (?), Get help, and
  Settings ⌘,. The app has Settings, Theme, What's new, and Sign out only.
  Theme must be added to Paper's menu (done in my frame).
- Toasts: Paper puts them at the bottom centre, one line, no close button, with
  an optional action ("Print receipt"). The app shows a two-line card with a
  close button, bottom right.
- Collapsed sidebar: the logo doubles as the expand button (the app does this).
- What's new: the app's page uses pills and cards; rebuild it with bands and
  rows. Keep the "Sample data" mark.
- Not built yet: the app has no such page now; old `/soon` links redirect.
  Build it only if a section ships before its screen.

## 5. Open questions

1. **Sidebar order.** I chose Home, Inbox, Agents, Members, Sales, Check-ins,
   Schedule, Programs, Products, Reports. Recommendation: keep it. Alternative:
   put Inbox and Agents last, under Reports, because they show sample data.
2. **Receptionist permissions.** Roles live in WorkOS, so I could not read the
   real receptionist set. I assumed no `purchases:create` and no money totals.
   Which Home facts may a receptionist see?
3. **Check-in from Home.** The app checks members in on the Overview page,
   including the staff override ("Let in anyway" with a reason) and next steps
   after a denial. Paper's Home only has "Check in C". Confirm that the
   check-in flow (and its override) lives in the Check-ins page design.
4. **Not built yet.** Keep this page, or drop it, since every section now has a
   screen?
5. **Theme in the account menu.** I placed it after Keyboard shortcuts. Confirm
   the position.

## 6. Not verified

- I did not open the app in a browser; I read the code.
- Receptionist permissions are assumed (see question 2).
- Dark frame: SVG icon strokes still use the light `--muted-foreground` value
  (#616161), because I could not override CSS variables per frame. Status
  colours (green, amber) also keep their light values, which are dim on #101011.
  The app uses its own dark status values.
- Toasts in my frame use `--tag-blue` for info. Paper has no info colour token.
- The "What's new" content is the app's sample data, shortened.

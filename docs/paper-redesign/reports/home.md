# Home and app chrome — Paper report

**Sidebar to clone: node `1IXF-0`** ("Sidebar · All pages", in "App — Sidebar with all pages"). It is fixed and ready.

Page: "Home" (`p-K-0`) in "Flowfokus Redesign". I did not change any existing
artboard. Every new frame starts from "Home — Today" (or a copy of one of my
copies of it) and uses the new sidebar.

## Layout on the page

- Row 1 (y 0): the user's frames, unchanged.
- Row 2 (y 1200): sidebar, then the Home states.
- Row 3 (y 2400): organization switcher, ⌘K states, account menu, toasts, and a sheet of small states.
- Row 4 (y 3600): collapsed sidebar, dark theme, What's new.

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
label, and selected fill as the others. The Inbox, Agents, and Schedule labels
now match the other seven value for value (13px/20px, weight 500, `--font-sans`,
`--foreground`, `display: inline-block`, `font-feature-settings: "tnum"`,
`flex-grow: 1`). Icons: inbox tray, bot, and a calendar with a clock for
Schedule (Programs keeps its calendar with a check). All icons are 16px with a
1.5 stroke in `--muted-foreground`.

All my new frames use this sidebar, with the same label styles and Schedule icon. Existing frames still have the seven-item
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
| ⌘K, role without `members:read` ("Search pages…", every page, no members) | App — ⌘K without members:read | added |
| ⌘K, member search failed | — | not designed: same status line as "no results", with the failure text. |
| Account menu, open | Member details — Priya Nair (`DNR-0`) | existed |
| Account menu, Theme choice (Light, Dark, System) | App — Account menu, Theme | added |
| Toasts: success, info, error | App — Toasts | added |
| Dark theme | App — Dark theme | added |
| What's new (sample data) | What's new — Sample data | added |
| Not built yet page | — | not designed: the app never shows it. `routes/$org/soon.tsx` only redirects old links. I deleted my frame. |
| "Staff access is turned off", "Cannot open <organization>" | — | owned by the Settings and sign-in agent |
| Sign-in, settings | — | not designed: owned by "Settings & sign-in" |

## 2. Added

- **App — Sidebar with all pages.** Home — Today with the ten-item sidebar.
  Canonical sidebar node `1IXF-0`.
- **Home — Loading.** Same bands and title. Rows, band counts, and the
  properties values are grey skeleton bars. Payments today keeps its four
  labels with skeleton values.
- **Home — Load error.** Each list shows one row: a red 16px icon, "Sessions did
  not load" / "Needs attention did not load", the failure text, and "Try again".
  The properties column shows "Counts did not load". The rest of the page stays.
- **Home — Receptionist (cannot sell).** No "Sell S" in the top bar. No money
  anywhere: Sales, Collected, Payments today, and the "RM 640.00" in Needs
  attention are gone. Footer reads "Nadia · Receptionist".
- **Home — Quiet day.** "No more sessions today." with "Open schedule →".
  "Nothing needs attention." Properties show zeros and "No sessions". Payments
  today shows Cash, Bank transfer, Card, and Stripe at RM 0.00, as the original.
- **App — Organization switcher.** The location menu's design (260px, 32px rows,
  search on top) with organizations: a letter tile, the name, the role on the
  right, a check on the open one.
- **App — ⌘K searching / no results / without members:read.** The existing ⌘K
  dialog. Searching shows a skeleton row and "Searching members…". No results
  shows "Nothing matches “zzq”." Without `members:read` the placeholder is
  "Search pages…", there are no member results, and the Pages group lists every
  page (ten sidebar pages, Settings, What's new). The user is "Aina · Instructor".
- **App — Account menu, Theme.** The account menu from Member details, plus one
  row: "Theme · System ›", with a submenu: Light, Dark, System (checked).
- **App — Toasts.** Paper's toast (40px, 14px filled icon, one line) in three
  tones, stacked at the bottom centre: info (blue), error (red), success (green).
  The detail follows a "·" in grey. The success toast is "Price archived", so
  the Home counts behind it stay true.
- **App — Menus and top bar states.** A sheet, not a full frame: organization
  menu with one organization, organization no match, location no match, and four
  top bars (no actions; one primary action "Create sale ⌘↵"; several actions
  and ⋯; no locations).
- **App — Collapsed sidebar.** The 56px rail: logo, ten icons, the selected fill
  on Home, and the avatar. The logo is the expand button.
- **App — Dark theme.** Home — Today in dark. **This is the one frame with raw
  hex**, because the file has no dark tokens: page and surface #101011, well
  #19191B, hover #1F1F22, line #26262A, text #F2F2EE, secondary text and grey
  icons #A3A3AA, chevrons and idle marks #5C5C63, green status #3DD68C, amber
  status #F5A524, avatar #3E3E44 with letter #CFCFD3, logo tile #26262A,
  window hairline #26262A.
- **What's new — Sample data.** Title with a "Sample data" mark, no page
  actions. One band per release (title, then the date), then rows with a small
  green check.

## 3. Conflicts

None in my frames. Card and Stripe moved to "Needs app or Rails work".

## 4. Needs app or Rails work

Home (Paper's design differs from the current Overview):

- **Built.** Up next: today's sessions with time, type, trainer, booking fill, and
  "View all 9 sessions". The schedule API supplies them (`days=1`). Waiting lists
  ("Full · 3 waiting") still need Rails.
- **Partly built.** Needs attention: the two counts show and open the filtered sales
  list. Still needs Rails: the total due, the oldest sale and its age, names of
  unfulfilled sales, and memberships that end this week. Rails counts only paid
  sales as awaiting fulfillment, so the row says "1 paid sale unfulfilled".
- **Partly built.** Today properties: Check-ins and Bookings ("58 of 96 spots",
  from the schedule). Still needs Rails: sales total and count, collected, new
  members, and Payments today by method. The group is left out until then.
- Sale numbers (#1041). Rails has no sale numbers.
- Card and online (Stripe) payments in "Payments today". The app records Cash
  and Bank transfer only. Every Home state shows the same four rows as the
  original; whether Card and Stripe stay is the user's decision.
- **Built** (in the toast slice). Error copy: the app's failure text ("The Flowfokus API did not respond. Check
  that Rails is running…") is for developers. Frames say "Check your
  connection, then try again."; the app copy must change.
- **Built.** Page title "Today" with the date and desk location.
- **Built.** Top bar "Check in (C)" and "Sell (S)" on Home, with ⋯ (New member). The app has New sale
  and no shortcuts on Overview. Hide Sell without `purchases:create`; the app
  shows New sale to every role today.
- **Built.** "Try again" on a failed list.
- **Built.** Quiet day: "Open schedule" link.
- Not built. First run checklist (existing frame): needs setup progress from Rails.

Chrome:

- **Built.** Sidebar: rename to Paper's names (Home, Check-ins, Products) and use the
  ten-item order above.
- **Built.** Organization switcher: show the role on the right in one row (the app shows
  it as a second line).
- **Partly built.** Location switcher (existing frame): "Manage locations" opens the
  Settings locations section. "All locations" is left out: check-in, sales, and the
  schedule all need one desk location.
- **Partly built.** ⌘K (existing frame): the Actions group is built, without the C
  and S hints (typing goes into the search field). Member numbers (M-0412) need
  Rails. Paper's Actions group: "Check in
  Priya Nair C", "New sale for Priya Nair S". The app shows name and email
  until Rails has member numbers.
- **Partly built.** Account menu (existing frame): Settings ⌘,, Keyboard shortcuts (?)
  with a shortcuts sheet, Theme, What's new, and Sign out. Profile and Get help are
  left out: no page exists for them.
- **Built** (in the toast slice). Toasts: Paper puts them at the bottom centre, one line, no close button, with
  an optional action ("Print receipt"). The app shows a two-line card with a
  close button, bottom right.
- **Built.** Collapsed sidebar: the logo doubles as the expand button (the app does this).
- Not built (sample page, out of this slice). What's new: the app's page uses pills and cards; rebuild it with bands and
  rows. Keep the "Sample data" mark.

Phone and tablet (from `reports/phone.md`):

- **Built.** Phone Home, the tab bar (Home, Members, Check in, Sales, More), and the
  phone app bar. More opens the existing drawer, not a separate More page.
- **Already built.** The tablet rail with all ten pages.

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
4. **Theme in the account menu.** I placed it after Keyboard shortcuts. Confirm
   the position.

## 6. Not verified

- I did not open the app in a browser; I read the code.
- Receptionist permissions are assumed (see question 2).
- Dark frame: the logo mark's dots keep their own colours; only its tile
  changed. Whether the brand mark needs a dark variant is open (review note 15).
- Toasts in my frame use `--tag-blue` for info. Paper has no info colour token.
- The "What's new" content is the app's sample data, shortened.

## Review fixes

Review: `docs/paper-redesign/reviews/home.md`.

1. Dark icon strokes: fixed, every grey icon stroke is #A3A3AA.
2. Dark marks: fixed, breadcrumb and row chevrons are #5C5C63.
3. Dark green status: fixed, #3DD68C.
4. Dark amber status: fixed, #F5A524 on the dots, the pie, and "RM 640.00".
5. Sidebar label styles: fixed, Inbox, Agents, and Schedule match the other seven value for value, in `1IXF-0` and every copy.
6. Schedule icon: fixed, a calendar with a clock, 16px, 1.5 stroke, in `1IXF-0` and every copy.
7. Card and Stripe: fixed by the new rule. Every Home state shows all four rows, with state amounts; the report lists them as app work.
8. ⌘K without members:read: fixed, every page shows, no members, user "Aina · Instructor".
9. Receptionist money: fixed, "RM 640.00" removed; no money shows anywhere.
10. "Create sale" key hint: fixed, ⌘↵ in the same style as the New sale page.
11. Blocked pages: not drawn; they belong to the Settings and sign-in agent.
12. Not built yet: fixed, artboard deleted; the app never shows it.
13. Sidebar order: kept.
14. Dark avatar: fixed, #3E3E44 with letter #CFCFD3.
15. Dark logo tile: tile set to #26262A so its edge shows; a dark brand mark is the user's call.
16. Developer error wording: fixed in the frames ("Check your connection, then try again."); app copy listed as app work.
17. Hairline with nothing under it: fixed, Payments today now sits under the Today group in the quiet day and in every frame built on it.
18. Open trigger fill: fixed, the organization trigger has no fill, as the location switcher.
19. What's new: fixed, the intro lines are gone and both bands show only the date.
20. Coverage notes: not drawn. Account menu without Sign out (demo mode) and the rail's hover tooltip are small; left as notes.
21. Inherited 14px ⌘K query and raw #4A4A4A dot: left for the user, as the review asks.
22. Gap on row 3: fixed, the account menu, toasts, and the sheet moved left.

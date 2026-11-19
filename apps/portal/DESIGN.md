---
name: Flowfokus staff portal
description: Quiet operational UI with neutral surfaces and explicit state.
---

## Overview

Mode: Operate. Staff serve a customer at the desk. Each screen has one task.
Use a title, clear controls, and direct actions. Cut taglines, routine helper
text, and repeated labels. Keep facts and action consequences. The current
palette has dark and light surfaces, thin borders, and restrained status color.
The live source is `src/styles/tokens.css`, not the older gym-site style or a
new shadcn preset. Read [the system guide](../../docs/design-system.md) first.

## Colors

Raw hex swatches live in `src/styles/primitives.css`. Their names identify the
value, not its purpose. Components use semantic roles in `tokens.css`:

| Job | Token |
| --- | --- |
| Page / raised section / recessed group | `--color-page` / `--color-surface` / `--color-well` |
| Main / secondary / muted text | `--color-ink` / `--color-ink-2` / `--color-ink-3` |
| Disabled or decorative marks only | `--color-ink-4` |
| Divider / control boundary / keyboard focus | `--color-line` / `--color-field-line` / `--color-focus` |
| Completed / attention / failure / information | `--color-good` / `--color-warning` / `--color-critical` / `--color-info` |

Each status has matching wash and line roles. Show a label and an icon with
status color. Chart series colors identify data series; they do not imply status.
`light-dark()` owns both theme values. Root `.light` or `.dark` overrides the
system choice. The shadcn variables in `src/styles.css` bridge these roles;
shadcn's `--accent` means neutral hover, not the portal's blue accent.

## Typography

Use Figtree Variable for all text, as in Paper. Money, times, counts, and IDs
use equal-width figures (`font-variant-numeric: tabular-nums`) so they line up.
There is no mono font. Use the existing `--text-*`, `--font-weight-*`, and `--leading-*`
scales. Body text uses `--text-base` (14px); page titles use `--text-xl` (24px).
Use `Money` and `Time` for domain values.

## Layout

Use `PageHead`, `.stack`, and the existing `.grid-2` variants. `PageHead` has
a title, optional factual `meta`, facts beside the title (such as a status
pill), and `actions`; it has no instructional subtitle. Page actions go in the
top bar after Search, as in Paper: wrap them in `PageActions`
(`components/PageActions.tsx`; `PageHead actions` does this). Use compact 28px
buttons there. Phones have no room in the top bar, so the actions stay in the
page where `PageActions` sits. Use one primary action per decision group;
use secondary or ghost buttons for alternatives. Keep table reading order on
small screens, and preserve key facts in the existing phone summaries.

The shell uses a phone layout below 768px, a tablet rail through 1180px, and a
full desktop sidebar from 1181px. Data layouts can have their own breakpoints.
Use the existing `--space-*` scale. Note that `--space-7` is 32px and
`--space-8` is 40px; these names are not Tailwind spacing numbers.

## Elevation & Depth

Separate ordinary sections with surface color and thin borders. Use the existing
popover, dialog, and toast shadow tokens only for those floating surfaces.
Use `--duration-press` and `--duration-hover` for repeated control feedback.
Special transitions retain their existing timing. Preserve reduced-motion rules.

## Shapes

Use the `--radius-*` tokens. Controls use `--radius-md`; components retain their
existing radius classes. Small status pills can be fully rounded. Controls use
`--control-height` (44px), with the existing compact variant where appropriate.
Do not replace the radius scale with Tailwind's default values.

## Components

Import primitives from `src/components/ui/`. Domain wrappers and blocks live
in `src/components/ui.tsx` and named files under `src/components/`.

| Need | Existing API and default | State contract |
| --- | --- | --- |
| Action | `Button`: `variant="default"`, `size="default"` | CSS supplies hover, press, focus and disabled. Use `SubmitButton` for pending forms. |
| Alternative / destructive action | `secondary` (`outline` is an alias), `ghost`, `destructive` | Confirm consequential changes with `ConfirmDialog`; critical tone starts focus on Cancel. |
| Navigation styled as an action | Router `Link` with `buttonVariants()` | Keep link semantics; do not nest a button in a link. |
| Status | `Status state={…}` with visible label | Use the current response, not the requested outcome. `Pill` defaults to neutral for other labels. |
| Form field | `Field`, `describedBy`, `ui/input`, `ui/native-select` | Match input ID to field ID. Link hint/error IDs and set `aria-invalid`. |
| Section | `Plate` (also exported as `Card`) | Title names the section. `flush` fits a table; `footer` holds totals or actions. |
| Feedback | `Notice` defaults to info; `FailureNotice` displays API failures | Use `live` for changed feedback, not every static notice. Error text gives a next step. |
| Collection state | `LoadingState`, `Empty`, `ErrorState` | Loading reserves space; empty describes no records; error describes a failed load. |

Good: sales rows use `PaymentMark` and `FulfillmentMark` from
`features/sales/SaleFacts.tsx`. Payment (Paid, Part paid, Unpaid, Void) and
fulfillment (Fulfilled, Unfulfilled, Access revoked) stay two separate marks.
Bad: setting `state="fulfilled"` because the user clicked Fulfill before Rails
returns success. Payment and fulfillment are separate facts.

Good: `SubmitButton pending={action.pending} pendingLabel="Saving…"` keeps a
clear label and prevents repeat submission. Bad: a hand-styled `<div onClick>`
with no disabled, focus, or pending behavior.

Existing blocks to compose before adding another abstraction:

- `PageHead`: title, optional record metadata, title facts, and actions.
- `PageActions`: a page's actions, placed in the top bar from 768px.
- `Plate`: named section with body and optional action/footer.
- `PaymentMark` / `FulfillmentMark`: a sale's two facts, on the sales list, sale page, and member page.
- `ListPager`: the range and page buttons under a redesigned list.
- `FormNotice`: a form's failed request in one bordered line (red icon, title,
  staff sentence). The fields keep their values.
- `useCheckIn` (`features/check-ins/CheckInFlow.tsx`): checks a member in and
  shows the toast or the denial dialog. Home, Check-ins, and the member page use it.
- `ConfirmDialog`: one consequential decision with pending handling.
- `Field` plus `FailureNotice`: field errors and request failure at separate levels.

See the component source for exact props. Only document or use built variants.
A data block's parent owns loading, empty and failure branches; presentational
pieces do not each need their own request.

## Do's and Don'ts

- Make grouping and actions clear before adding words. Avoid card stacks around a single form.
- Keep real views in their domain folders and sample features in `features/preview`.

- Use semantic tokens in screens. Change raw swatches only in the palette.
- Reuse existing components before adding another variant.
- Keep status words tied to Rails facts. Paid does not mean fulfilled.
- Say Fulfill, not Deliver: Fulfill, Fulfill early, Fulfilled, Unfulfilled,
  and Fulfillment for the filter and column. The word matches Paper and the
  Rails domain term Fulfillment, so staff, designs, and code use one word.
- Keep focus visible, icon-only controls named, and fields labelled. Text
  fields show focus as a 1px ink border, as in Paper, with no ring. The search
  menu's field has no box at all. Buttons, menus, and other controls keep the
  `--color-focus` ring for keyboard focus.
- Preserve both themes and reduced motion when changing styles.
- Treat preview data as preview data. Do not imply it came from the API.

## Redesign direction

This section records the target for the portal redesign. The sections above
describe the live app. Where they conflict, the live rules apply until a screen
moves to the redesign. The reference is the "Member details page" in the
Paper file "Flowfokus Redesign". Earlier explorations live in the separate
file "Flowfokus Redesign — Explorations".

Layout:

- Use one white surface. Separate sections with spacing and headings, not cards.
- Use few lines. Keep borders only on buttons, the comment box, and floating menus.
- Do not use decorative backgrounds. Use grey fills only for interaction states,
  such as the selected nav item or a hovered menu item. The one exception is
  the list section header: a flat light-grey band with rounded corners. It
  starts on the content edge, like the page title, and its text sits 12px
  inside. Rows below it have 12px side padding so their text lines up with the
  band's. Nothing hangs outside the content column. The activity feed header
  has no band, because the comment box below it already marks the start.
- Use neutral colors first. Keep color for small status marks.

Information:

- Show only what helps the owner act. Remove pills, counts, and banners that repeat a fact.
- Show each fact once.
- Show recent or active items in each list. Put the total in the heading, such as
  "Recent 5 of 11", and put "View all …" at the bottom right.
- Write rows as short facts, such as a date range or "3 of 5 left".

Structure:

- Keep one page per member. Membership, passes, bookings, sales, activity, and
  details sit on that page. Check in, Sell, and Book start there.
- Show details as Linear-style properties: a grey label, then a value with a
  small icon. Click the value to edit it. Do not use pencil buttons.
- Show comments, pinned comments, and system events in one feed. Filter it by
  All, Comments, or Activity. Fold older events behind "Show earlier events".
- Put organization, location, section, and page in the top bar breadcrumb. The
  sidebar holds only the logo, the collapse button, the nav, and the account menu.

Styling:

- Use three text sizes: 20px for the page title, 13px for body text and
  headings, and 12px for secondary text. Use weight and grey tone for hierarchy.
- Use two font weights only: 400 for body text, 500 for headings and emphasis.
- Take greys from the Tailwind CSS neutral palette (see
  `docs/paper-redesign/README.md` for the token map).
- Use an 8px radius on controls and 12px on floating surfaces (menus, dialogs,
  toasts, panels, cards). Circles keep their shape; checkboxes and square
  tiles under 20px use 4px.
- Draw progress bars solid by default. A dotted pattern is an optional variant.
- Put one 16px grey icon on each section title. Keep list rows as plain text.
- Show status as a colored 16px icon with grey text, such as a green pie for
  "Renews in 29d 16h" and a red pie for "Ends in 27d 23h · Cancelled".
- Use 28px buttons with shortcut keys (C, S, B, ⌘K). Do not put a search field
  in the app chrome. Search opens from ⌘K.

## Redesign foundation

The tokens and the shell now follow the redesign. Screens that have not moved
still use their older components on the new palette.

Tokens. `tokens.css` maps the Paper tokens to the existing roles:

| Paper token | Role | Light | Dark (derived) |
| --- | --- | --- | --- |
| `--background` | `--color-page`, `--color-surface`, `--color-sidebar` | #FFFFFF | #101011 |
| `--muted` | `--color-well` (section band, key hint) | #F7F7F7 | #19191B |
| `--accent` | `--color-hover` (hover, selected nav item) | #F4F4F3 | #1F1F22 |
| `--border` | `--color-line`, `--color-avatar` | #E3E3E3 | #26262A |
| `--foreground` | `--color-ink` | #303030 | #F2F2EE |
| `--muted-foreground` | `--color-ink-2` | #616161 | #A3A3AA |
| `--subtle-foreground` | `--color-ink-4` (marks only) | #8A8A8A | #5C5C63 |
| `--success` / `--warning` / `--destructive` | `--color-good` / `--color-warning` / `--color-critical` | #0D6B4E / #9A5B00 / #B3261E | earlier dark values |

Decision on muted text: the shadcn `--muted-foreground` now maps to `ink-2`,
which is Paper's #616161. It used to map to `ink-3`. Paper's subtle grey
(#8A8A8A) has 3.4:1 contrast on white, so it is `ink-4` and only colours
chevrons, slashes, and idle icons. Subtle text, such as a key hint or an ID,
uses `ink-3` (#707070), the lightest grey that meets 4.5:1 on the surface and
the band. Dark values keep the earlier dark ink and status colours on a single
#101011 surface.

Type. Redesigned screens use `--text-lg` (20px, semibold) for the page title,
`--text-sm` (13px) for body text and headings, and `--text-xs` (12px) for
secondary text. The base `h1` is now 20px. Figtree is the only font, as in Paper.
Numbers use its equal-width figures.

Controls. `Button size="compact"` (and `"icon-compact"`) is the 28px redesign
button with an 8px radius (`--control-height-compact`, `--radius-compact`). A
compact secondary button has a hairline and a 1px drop (`--shadow-control`).
Coarse pointers grow it to 40px. `Kbd` shows a key hint inside a button; put
`aria-keyshortcuts` on the button. Touch screens hide the hints. Show a hint
only where the shortcut works (`lib/shortcuts.ts`).

Shell. The sidebar (236px, no fill or edge) holds the logo, the collapse
button, one list of pages, and the account menu at the foot. The account
button shows the avatar and name only; the role shows in the organization
switcher. The account menu
holds Settings, Theme, What's new, and Sign out. The 48px top bar holds the
breadcrumb: organization, location, section, and page, then Search and the
page's actions on the right. A detail route names
its page with `staticData.crumb(loaderData)`. The top bar has no search field:
a compact Search button and ⌘K (Ctrl K elsewhere) open `CommandMenu`, which
finds members through Rails and opens pages. Its Actions group checks in or
sells to the first member found, for roles that can. The organization
switcher shows the role on the right; the location switcher ends with Manage
locations. Below 768px the tab bar (`components/TabBar.tsx`) holds Home,
Members, Check in, Sales, and More, which opens the drawer. The rail is 56px wide; icons stay
at x=28 when the sidebar collapses.

Member details is the first redesigned screen (`features/members/MemberDetails.tsx`,
facts in `features/members/facts.ts`, styles in `styles/members.css`). It shows
only Rails data:

- Header: name, last visit, and balance due. Check in (C) opens the check-in
  panel in a dialog; Sell (S) opens a new sale for the member. The more menu
  holds Renew when Rails offers renewal terms. There is no Book action yet.
- Membership: periods with a ring that fills with the time left, and grey text
  such as "Ends in 13d 11h". Access: rights with "7 of 8 left". Bookings and
  sales list recent rows and expand in place.
- Sale rows keep payment (Paid, Part paid, Unpaid, Void) and fulfillment
  (Fulfilled, Unfulfilled, Access revoked) as separate facts, then the
  payment method and the amount, with any balance due under it.
- Activity merges check-ins, sales, payments, fulfillments, refunds, voids,
  bookings, and the join date. It has no comment box or filters, because
  Rails has no member comments.
- Properties: email, gym site sign-in (click the value to create a link code
  or unlink, with members:link), member since, and total paid.

The members list and New member are the next redesigned screens
(`features/members/MembersList.tsx` and `NewMember.tsx`, helpers in
`features/members/list.ts`). They show only Rails data:

- Members list: the title, New member (members:create only) in the top bar,
  then a 28px search field with a "/" hint. Rails searches name and email as
  staff type; Escape clears. A grey header band, then 52px rows with the
  initials, name, email, and join date. Each row opens the member. The footer
  counts members and pages them 50 at a time. Phones hide the join date.
  There is no Filter, Display, selection, or bulk action, because Rails has no
  member status, filters, or bulk endpoints.
- No results: one line and Clear search. No members: one line and New member.
- New member: a page, not a dialog. An icon tile and the title, Create member
  (⌘↵) in the top bar, then the Profile band with Full name and Email.
  Email is required because Rails requires it. Errors show on the fields, with
  a summary above. Leaving with typed details asks "Discard this member?".
  After a create, the member page opens with a "Member created" toast. The
  toast has no New sale action; Sell (S) is on the member page.

The sales list and sale details are the next redesigned screens
(`features/sales/SalesList.tsx`, `SaleDetails.tsx`, and `SaleDialogs.tsx`;
facts, filters, and action rules in `features/sales/facts.ts`). They share the
list pieces in `components.css` (`.list-search`, `.list-pager`, `.list-state`)
and `ListPager` with the members list. They show only Rails data:

- Sales list: the title, New sale (purchases:create only) in the top bar. Filter
  opens Payment and Fulfillment submenus with a count per value; each active fact
  shows as a chip with a clear button. Search (with a "/" hint) matches member
  name, email, and item. A header band, then 44px rows: member, item and price,
  payment, fulfillment, total (with the balance due or the amount refunded), and a
  short date. The URL keeps filters and search (`payment`, `fulfillment`,
  `q`); old `view=due`, `view=deliver`, and `delivery=` links still work.
  Rails returns every sale, so the list filters and pages 50 at a time in the
  browser. Phones show member and total,
  then the item, then the facts and the date.
- No sales: one line and New sale. No match: one line and Clear filters.
- Sale details: a tile, the item as the title, and the two facts as pills. The
  ⋯ menu in the top bar holds Record payment (P), Fulfill (F), Refund…,
  Revoke access…, and Void sale…; each appears only when the permission and
  the sale allow it. Items shows the fulfillment fact and time, the line with its
  period or term and rights, early-fulfillment and revoke notes, and the total.
  Payment lists payments and refunds in order, then the balance due. Activity
  lists what Rails recorded. Properties: member, location, date, and price.
  A void sale shows one bordered notice with the reason.
- Dialogs follow the Paper "Dialogs and menu" frame: a 48px header with a fact
  and a close button, the fields, then Cancel and the action. ⌘↵ submits the
  record and fulfill dialogs. Record payment offers Cash and Bank transfer and
  says it does not move money. Fulfill states what it creates; with money due
  it becomes Fulfill early and needs a reason. Refund chooses the payment in
  the dialog and says access stays. Void and revoke need a reason.
- Not shown, because Rails has no data for them: sale numbers, who sold or
  recorded a payment, notes, comments, invoices, card or e-wallet payments,
  attachments, receipts, and several lines in one sale.

New sale is the next redesigned screen (`features/sales/NewSale.tsx`, rules in
`features/sales/saleDraft.ts`). It reuses the sale page's lines, totals, and
dialog frame, and the record-payment fields (`PaymentFields`). It shows only
Rails data:

- A page, not a dialog. A tile and the title, Create sale (⌘↵) in the top
  bar. Products and Payment on the left; Member and Location on the right
  from 1100px. Phones put Member and Location first.
- Products holds one line, because Rails sells one line, quantity one, at the
  price's current amount. "+ Product" opens Add product: search, then All,
  Memberships, and Passes when both are on sale, then one choice. Tickets are
  left out: they are sold for a session time from the schedule.
- Record payment adds Cash or Bank transfer before the sale exists. Nothing is
  sent until Create sale; then Rails records the sale, then the payment.
  Balance due turns warning-coloured while money is due.
- Member: a search of name and email; a chosen member shows the name and
  email, with a button to change. Sell (S) on a member page and `?member=`
  start with the member chosen. Location starts at the desk location.
- Errors show on the member, product, and location, as in Paper "4a". Leaving
  with a product, a payment, or a changed member asks "Discard this sale?".
- After a create, the sale page opens with a "Sale created" toast that says
  what is due. If the payment fails after the sale exists, an error toast says
  so and the sale page still opens, so staff never create the sale twice.
- Not shown, because Rails has no data for them: custom items, quantity,
  several lines, notes, card or e-wallet, attachments, member numbers and
  phones, and "Add new member" from the search.

Check-ins is the next redesigned screen (`features/check-ins/CheckIns.tsx`,
the check-in flow in `CheckInFlow.tsx`, the search in `FindMember.tsx`, facts
in `facts.ts`, and idempotency in `attempt.ts`). It shows only Rails data:

- Today's list: the title, Check in (check_ins:create) and ⋯ with Export
  visits as CSV in the top bar. Filter by Result (Checked in, Denied, with
  counts) and a "/" search over today's rows. A header band, then 44px rows:
  24-hour time, member, location when there are several, and the result with
  its reason. Each row opens the member. The footer is the Rails day count.
- Check in opens Find member: Rails searches name and email as staff type.
  Choosing a member checks them in at the top bar location at once. States:
  searching, no match (New member), search failed, no location (Add
  location). Phones put the search in the page above the list.
- The result is a toast. A failed request shows an error toast with Try
  again, which resends the same idempotency key. A denial opens the denial
  dialog: the access fact from the Rails reason, the balance due when the
  role can read sales, then New sale (no access) or Renew (no visits left).
  "Let in anyway…" (check_ins:override) asks for a reason and lets the
  member in with the neutral primary button.
- C on the member page checks in directly, with the same toast or dialog.
- No check_ins:read: one line naming the permission. No check_ins:create: no
  Check in.
- Not shown, because Rails has no data for them: the right used, credits
  used, access hours, the cause behind "no active access", Undo, member
  numbers and phones, access in the search, a check-in detail page, and
  walk-ins.

Schedule and Session details are the next redesigned screens
(`features/schedule/Schedule.tsx`, `SessionDetails.tsx`, `BookMember.tsx`,
and `SessionDialogs.tsx`; facts in `facts.ts`, status marks in `marks.tsx`,
styles in `styles/schedule.css`). They show only Rails data:

- Schedule: the title, Programs in the top bar, then Filter and the range
  with Earlier, Today (off today), and Later. Two weeks at the top bar
  location, one grey band per day with its session count, then 52px rows:
  time, program, kind and host (or length), and the status mark: a green pie
  for "9 of 14 booked", an amber dot for Full, a red cross for "Cancelled ·
  reason", and a grey tick for "Ended · 11 of 12 booked". Ended and cancelled
  rows are grey. Filter has a Program submenu with counts; the URL keeps
  `from` and `program`. Phones show the start time, then "Until …", and the
  status under the name.
- Nothing scheduled: one line and "Add sessions from a program". No match:
  one line and Clear filters. Did not load: one line, the reason, Try again.
- Session details: a tile, the date and time as the title, program and kind
  under it. Book member (B) and ⋯ (Open program, Cancel session… with
  programs:manage) sit in the top bar while the session is open. The
  breadcrumb is Programs › program › session, and Programs is the active
  page. Properties: program, host, location (with several locations), time,
  capacity, status, and the cancel reason.
- The roster has three bands: Not marked (booked and held), Attended, and
  Cancelled (cancelled and expired, folded unless the session is cancelled
  or has no other bookings). The band says "Attended", the Rails word, not
  Paper's "Checked in": a gym check-in is a separate fact. Rows show
  initials, the name, "Guest of …" or "Booked by …" from the holder, what
  happened to a cancelled spot (reason, "Credit returned", "Refund from the
  sale", "Hold expired, payment not received"), the right as a chip,
  "Awaiting payment" on a held spot, and the day it was booked. The status
  icon opens the attendance menu; A marks the focused row; right-click or ⋯
  opens Mark attended, Open member, Open sale, and Cancel booking….
  Phones put Details first and write each row as two lines of text.
- Book member is one dialog: find the member, then one choice: a pass or
  membership they hold, or a ticket. Tickets can buy up to ten spots; each
  other spot is a member or a named guest. The footer action names the
  choice ("Book with Monthly unlimited", "Sell 3 × Drop-in · RM 105.00").
  States: passes loading, passes did not load, already booked, full, not
  booked, sale not recorded, and roles that can only book or only sell. A
  ticket sale keeps one Idempotency-Key per request, so a retry never sells
  twice. After a sale the page stays on the session; the toast has Open sale.
- Cancel session and Cancel booking use the Paper confirm frame: a title,
  the consequence, a required Reason, then Keep and the red action. Cancel
  booking on a pass offers to give the credit back.
- Not shown, because Rails has no data for them: no-show and undo, bulk
  marking, member numbers, the sale's payment state on a booking, Change
  payment, Collect payment, Move, session activity and comments, and
  cancellation emails.

Home is the next redesigned screen (`features/home/Home.tsx`, facts in
`facts.ts`, styles in `styles/home.css`). It shows only Rails data:

- The title "Today" with the date and the desk location. Check in (C) opens
  Find member and uses `useCheckIn`; Sell (S) shows only with
  purchases:create; ⋯ holds New member (members:create).
- Up next: today's sessions at the desk location that have not ended, from
  `/staff/occurrences?days=1`, up to four, with the Schedule status marks.
  The band says "4 of 9 today"; the link opens the schedule. Roles without
  programs:read do not see it.
- Needs attention: "4 sales with a balance due" and "1 paid sale
  unfulfilled" from the overview counts. Each opens the filtered sales list
  for roles with purchases:read. Rails counts only paid sales as awaiting
  fulfillment, so the row says "paid".
- Today: Check-ins (total and denied) and Bookings (booked of capacity in
  today's sessions that run).
- Quiet day: "No more sessions today." with Open schedule, and "Nothing
  needs attention." Loading keeps the title and bands. Did not load shows
  one row per section with Try again, and "Counts did not load".
- Phones: the check-in count under the title, no properties, no actions in
  the page (Check in is a tab), and two-line rows.
- Not shown, because Rails has no data for them: sales, collected, new
  members, and payments today; the total due and the oldest sale; names of
  unfulfilled sales; memberships ending this week; sale and member numbers;
  waiting lists; and first-run setup progress.

Programs, Program details, and New program are the next redesigned screens
(`features/programs/ProgramsList.tsx`, `ProgramDetails.tsx`,
`ProgramForm.tsx`, and `ProgramDialogs.tsx`; facts in `facts.ts`, kind
tiles in `kinds.tsx`, publishing in `publish.ts`, styles in
`styles/programs.css`). They show only Rails data:

- Programs: the title, New program (programs:manage) in the top bar, Filter
  (Kind, Visibility, with counts and chips) and a "/" search over names and
  hosts. A header band, then 52px rows: the kind tile (two people, ticket,
  clock), the name with Staff only, kind and length (and the location when
  there are several), the host with an initial, and the upcoming count. Rails
  returns every program; the list sorts by name, filters, and pages 50 at a
  time in the browser. The URL keeps `kind`, `visibility`, and `q`. Phones
  drop the header band and put the host on line 2.
- No programs: one line ("A manager adds programs." without manage). No
  match: the search tile, one line, Clear search or Clear filters. Did not
  load: one line, the reason, Try again. Loading keeps the toolbar and band.
- Program details: the kind tile and the name. Add sessions (T), Sell ticket
  (S), Book member (B), and ⋯ with Publish or Make staff only (⇧P) and Edit
  program in the top bar, each only for roles and states that allow it. The
  Sessions band lists sessions from today, ten first, then "Show N more".
  Rows show the day, the time, Today, and the schedule's status marks; Ended
  compares `ends_at` with now. Properties: Kind, Host, Length, Capacity,
  Visibility, Location (several locations), then Tickets (+ opens New ticket),
  "Also bookable with", and the Note. Phones put Book member first, hide
  Add sessions from the action row, and add it to the Sessions band.
- Ticket rows: the name, Off sale or Archived with a grey mark, the amount,
  and ⋯ with Put on sale or Take off sale, and Archive price… (the shared
  confirm). Prices sort by name, so a change of state does not move a row.
- Sell ticket and Book member reuse `BookMemberDialog` from the schedule with
  a Session picker (`sessions`); Sell ticket (`mode="sell"`) offers tickets
  only. A ticket buys spots in one session.
- Add sessions and New ticket use the sale dialog frame: labels above 32px
  fields, ⌘↵, and `FormNotice` when Rails does not answer. Add sessions sends
  Rails' first date, start time, and 1 to 26 weeks; the summary says
  "4 sessions · Tuesdays, 07:00 · 17 Nov to 8 Dec · 12 spots each".
- New program: a page with Details (Name, Kind cards, Host, Length, Spots
  per session) and Schedule (Starts at, From, Repeat weekly for, or "No
  sessions yet") on the left; Location, Visibility, and Note on the right.
  Create program (⌘↵) creates the program with an Idempotency-Key, then adds
  the sessions. The created toast offers Publish; the published toast offers
  View on site when the gym site is public. Leaving with changes asks
  "Discard this program?". Phones put the properties first and the create
  bar at the bottom, with no tab bar.
- Edit program (`/programs/:id/edit`): the same page with Save changes, no
  Kind and no Schedule.
- Not shown, because Rails has no data for them: the next session per
  program, several hosts and a staff host picker, the weekly pattern
  subtitle, program activity and comments, Duplicate and Archive program,
  pass credits per program, ticket Covers, Who can buy, and Sell online,
  several days per schedule, Until, and specific dates.

Products, Product details, and New and Edit product are the next redesigned
screens (`features/products/ProductsList.tsx`, `ProductDetails.tsx`, and
`ProductForm.tsx`; rules in `facts.ts`, the price change in
`priceChange.ts`, loading in `load.ts`, styles in `styles/products.css` on
top of the programs pieces). They show only Rails data:

- One price per product (decision of 18 Nov 2026). Staff see the first price
  on sale; Rails keeps fixed prices underneath. A new amount or length adds a
  new price, then archives the old one; members who bought keep theirs. The
  form says this under Price before staff save. The new price exists before
  the old one goes, so a product never has nothing on sale. If the archive
  fails, the form says both prices are on sale, and saving again only
  archives: each save first loads the product and reuses a price an earlier
  try made. Other prices still on sale show in an "Other prices" band.
- Products: the title, New product (products:create) in the top bar, Filter
  (Type, Status, with counts and chips) and a "/" search over names. A header
  band, then 44px rows: the kind icon and name, type, terms ("10 bookings ·
  60 days"), status (On sale, Staff only, Not sold), and the price. Not sold
  rows are grey and sort last. Tickets are left out; they live on the program
  page. Phones put type, terms, and status on line 2.
- Product details: the tile, the name (with "Not sold"), and "Membership ·
  30 days · RM 220.00". Sell (S, purchases:create, price on sale) opens New
  sale with the product chosen; Edit (E) and ⋯ (Publish or Make staff only,
  Take off sale or Put on sale, Edit product, Archive price…) need
  products:update. Main column: Other prices, then Benefits ("Changes apply
  to new sales"). Properties: Type, Price, Length or Valid for, Uses (pass),
  Sold, and the Note. Phones put Sell first and dark.
- New product and Edit product: Details (Name, Price, Type cards), Terms
  (Length or Valid for, in days from fulfillment), and Benefits (Name,
  Gives, visits or bookings, Location, Programs). Gym site and Note on the
  right. ⌘↵ saves; leaving with changes asks first. Edit has no Type. A new
  product needs products:create and products:update, because adding its
  price needs update. If the price fails after the product exists, an error
  toast says so and the product page opens, so staff never create it twice.
- Not shown, because Rails has no data for them: holders, product activity
  and comments, archive and restore of a whole product, access hours, who
  can buy and member tags, a desk or online channel beyond the gym site,
  product-level locations, pass credits and "valid from first use", and
  Sold or Last 30 days counts.

Settings and the sign-in screens are the last redesigned screens
(`features/settings/`: `General.tsx`, `Locations.tsx`, `Staff.tsx`,
`Roles.tsx`, the sidebar in `SettingsNav.tsx`, the page frame in
`SettingsPage.tsx`; rules in `facts.ts`, `team.ts`, `abilities.ts`, and
`sections.ts`; styles in `styles/settings.css`). They show only Rails data:

- The settings sidebar replaces the page list: Back to app, the organization's
  General, Locations, and Staff, then Notifications and Integrations under
  "Samples" (`features/preview/SettingsSamples.tsx`, with the Sample data
  pill). Section icons show on the rail only. The breadcrumb is the
  organization, then Settings, with no location switcher. ⌘, opens Settings.
  Old `?section=` links still work. Phones get a section list and "‹ Settings".
- General: the name and currency as text, the gym site address
  (`<slug>.flowfokus.com`) with a Public switch, and the time zone. Changes wait
  in Paper's save bar (what changed, Discard, Save changes); leaving asks to
  discard. Roles without settings:manage see the values and the lock line.
- Locations: pin, name, address, and a chevron. A row opens the edit dialog
  (no detail page). New location in the top bar. A taken name reads "Another
  location is already called Bangsar". No remove: Rails keeps every location.
- Staff: name and email, role, and status ("Active", or a coloured icon with
  grey text for "Not synced yet" and "Inactive"). Invitations show "Invite
  expires …" in warning colour and "Not joined". A pending member with an
  invitation for the same email shows once, as the invitation. The ⋯ menu
  holds Role (only roles the viewer may grant) and Remove access…; an
  invitation's ⋯ holds Revoke invitation. Rails' `manageable` decides the ⋯.
  Toasts use Paper's words ("This can take a few minutes"). A refusal never
  shows Rails' text, which can name permission codes: `team.ts` maps it to a
  staff sentence and reloads the list when it is out of date.
- Roles: a table of what each role can do. Columns and ticks come from the
  WorkOS roles in `/staff/team`; `abilities.ts` only names groups of
  permissions. It needs staff:manage, like the staff list.
- Sign-in card (`components/Blocked.tsx`): the mark, a 16px title, one
  message (a red or amber icon for errors and warnings), one dark 36px
  button, and the account line with an underlined Sign out (still a POST
  form). The portal start sends staff to the WorkOS sign-in page; there is no
  password form in the portal. Staff access is turned off shows one plain
  message for every reason. `__root.tsx` has Page not found and the app error
  screen ("Something went wrong", Reload).
- Not shown, because Rails has no data for them: logo, editable name,
  contact email, week start, member ID prefix, location hours and counts,
  removing a location, staff last active and locations, the day an invite was
  sent, resend invitation, role descriptions, and the Payments, Booking rules,
  and Profile screens.

---
name: Flowfokus staff portal
description: Quiet operational UI with neutral surfaces and explicit state.
---

## Overview

Mode: Operate. Staff serve a customer at the desk. Each screen has one task.
Use a title, clear controls, and direct actions. Cut taglines, routine helper
text, and repeated labels. Keep facts and action consequences. The palette is
zinc, with dark and light surfaces, thin borders, and restrained status color.
The reference is the Paper file "Flowfokus Design". The live source is
`src/styles/tokens.css`, not the older gym-site style or a component library's
default theme. Read [the system guide](../../docs/design-system.md) first.

## Colors

Raw hex swatches live in `src/styles/primitives.css`. Their names identify the
value, not its purpose. Components use semantic roles in `tokens.css`. Paper's
tokens hold the dark values; the light values come from the light frames in the
same file, such as "Member details — Priya Nair · Light".

| Job | Token | Paper | Light | Dark |
| --- | --- | --- | --- | --- |
| Page | `--color-page` | `--background` | #FFFFFF | #09090B |
| Raised section, card | `--color-surface` | `--surface` | #FFFFFF | #18181B |
| Menu, dialog, popover | `--color-overlay` (= `--color-raised`) | `--raised` | #FFFFFF | #1F1F23 |
| Sidebar | `--color-sidebar` | window frame | #FAFAFA | #0C0C0E |
| Tinted frame around the window | `--color-frame` | artboard behind "Window" | #F4F4F5 | #050506 |
| Band, recessed group, key hint | `--color-well` | `--sunken` | black 4% | white 4% |
| Hover | `--color-hover` | `--hover` | black 3% | white 6% |
| Selected nav item | `--color-selected` | `--selected` | black 5% | white 10% |
| Divider | `--color-line` | `--border` | black 8% | white 10% |
| Stronger divider | `--color-line-strong` | `--border-strong` | black 14% | white 16% |
| Form control boundary (3:1) | `--color-field-line` | | #8B8B94 | #71717A |
| Main text | `--color-ink` | `--foreground` | #18181B | #F4F4F5 |
| Secondary text | `--color-ink-2` | `--muted-foreground` | #52525B | #A1A1AA |
| Muted text | `--color-ink-3` | `--subtle-foreground` | #6B6B74 | #8F8F98 |
| Marks and disabled only | `--color-ink-4` | `--subtle-foreground` | #8B8B94 | #71717A |
| Completed / attention / failure / information | `--color-good` / `--color-warning` / `--color-critical` / `--color-info` | `--success` / `--warning` / `--destructive` / `--info` | #18734B / #9A5B00 / #C62E28 / #245EAA | #5BBF8A / #E5B25D / #F0706A / #80B7F5 |

Muted text is not Paper's value in either theme. Paper's #71717A is 4.4:1 on
the light band and 3.7:1 on the dark surface, below the 4.5:1 that small text
needs. Light `--color-ink-3` is a step darker and dark `--color-ink-3` a step
lighter. Paper's value stays as the dark mark colour (`--color-ink-4`).

Contrast of text roles, measured on the rendered colours in the running portal
(the band is flattened onto the page). The status colours are also at least
4.9:1 on all four backgrounds in both themes:

| Role | Light: page / surface / raised / band | Dark: page / surface / raised / band |
| --- | --- | --- |
| `--color-ink` | 17.7 / 17.7 / 17.7 / 16.2 | 18.1 / 16.1 / 14.9 / 16.8 |
| `--color-ink-2` | 7.7 / 7.7 / 7.7 / 7.1 | 7.8 / 6.9 / 6.4 / 7.2 |
| `--color-ink-3` | 5.3 / 5.3 / 5.3 / 4.8 | 6.2 / 5.5 / 5.1 / 5.8 |

Each status has matching wash and line roles, made with `color-mix()` from the
status colour, so they follow both themes. Show a label and an icon with status
color. Chart series colors identify data series; they do not imply status. The
information color is also the focus ring and the link color (`--color-accent`
is an alias).

The primary button is a gradient (`--gradient-primary`), as in the Paper
frames: #303034 to #18181B with white text in the light theme, and #FFFFFF to
#DEDEE3 with dark text in the dark theme. It has a 1px light edge inside and
a soft drop (`--shadow-primary`). Other controls that need an ink fill (a
checked box, an avatar) use `--color-ink` and `--color-on-ink`.

`light-dark()` owns both theme values. Root `.light` or `.dark` overrides the
system choice. The theme variables in `src/styles.css` bridge these roles;
`--accent` there means neutral hover, not an accent color.

## Typography

Use Geist Variable for text and Geist Mono Variable for identifiers and code
(`--font-sans`, `--font-mono`), both loaded from `@fontsource-variable` in the
root route. Money, times, counts, and IDs use equal-width figures
(`font-variant-numeric: tabular-nums`) so they line up. Use the existing `--text-*`, `--font-weight-*`, and `--leading-*`
scales. Body text uses `--text-base` (14px); lists and forms use `--text-sm`
(13px) and `--text-xs` (12px); page titles use `--text-lg` (20px). The scale
also holds the sizes of the Paper detail frames: `--text-3xs` 10px,
`--text-2xs` 11px, `--text-lead` 15px, `--text-figure` 28px (a large figure,
with `--tracking-figure` and `--leading-figure`), and `--text-display` 36px
(a detail page title on Program and Session, with `--tracking-display` and
`--leading-display`). They are not applied to a page until its screen issue.
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
`HoldButton` uses `--duration-hold` (600ms, `--ease-in`) and `--duration-drain` (200ms);
`SwipeConfirm` springs back over `--duration-spring` (250ms).
Special transitions retain their existing timing. Preserve reduced-motion rules.

## Shapes

Use the `--radius-*` tokens: `--radius-sm` 6px, `--radius-md` 8px,
`--radius-lg` 10px, `--radius-xl` 12px, as in Paper. Compact (28px) controls use
`--radius-compact`, which is 6px. Other controls use `--radius-md`; components
retain their existing radius classes. Small status pills can be fully rounded.
Controls use `--control-height` (44px), with the existing compact variant where
appropriate. Do not replace the radius scale with Tailwind's default values.

## Icons

Every icon comes from one set, drawn in the Paper file "Flowfokus Design" (page
"Icons"): a 16px grid, a 1.25 stroke, round ends, soft corners. Use
`<Icon name="members" />` from `components/ui/icon.tsx`. Its names are in
`ICON_NAMES`, and the gallery shows each one at `localhost:4001/components/icon`.
Icons draw in `currentColor`, so the text color sets the icon color. The status
icons (`paid`, `fulfilled`, `partlyFulfilled`, `partlyPaid`) also use
`currentColor` for their mark; a tone class on the parent gives the status
color, and a grey part uses `--color-ink-3`. An icon hides from assistive
technology unless it has an `aria-label`, so put a text label beside it.
There is no other icon library in the portal. The gym site keeps its own.

Add a new icon to the Paper page first, then to `icon.tsx`. Where the set has
no icon for a job, use the closest one and say so here. These are the lucide
icons the portal used before, and what replaced them:

| Job | Icon |
| --- | --- |
| Alert, warning, info, notice (circle-alert, triangle-alert, info, bell) | `notifications` |
| Error, no, cancel, void, remove, delete, dismiss (x, circle-x, ban, trash, minus in Roles) | `close` |
| Clock, waiting, frozen (clock, snowflake) | `length` |
| Empty, off, unfulfilled (inbox, circle, package) | `unfulfilled` |
| Unpaid (circle-dashed) | `payments` |
| Part paid | `partlyPaid` |
| Archive price, hidden (archive, eye-off) | `visibility` |
| Gym access benefit, log in (dumbbell, log-in); Sign out (log-out, flipped) | `checkIns` |
| Refund, undo (undo-2); renew (refresh-cw); swap (arrow-right-left) | `arrowDown` / `sort` / `sort` |
| Notes, description (sticky-note, align-left) | `customItem` / `edit` |
| Bookings table (table-2) | `capacity` |
| Programs (calendar-check, layers) | `programs` |
| Linked, unlinked, new member (user-check, user-x, user-plus) | `profile` |
| Keyboard shortcuts | `developer` |
| Light, dark, system theme (sun, moon, monitor) | `appearance` for all three |
| Mixed checkbox (minus) | a CSS bar; the set has no minus |

Two groups of marks are not from the set and stay as they were: the time and
credit rings (`MemberDetails.tsx`) and the session status marks
(`features/schedule/marks.tsx`). Both are drawn state marks, not icons.



## Components

Import primitives from `src/components/ui/`. Domain wrappers and blocks live
in `src/components/ui.tsx` and named files under `src/components/`. See them
live, with code, at `localhost:4001/components` (local development only; see
[the gallery](../../docs/design-system.md#component-gallery)).

| Need | Existing API and default | State contract |
| --- | --- | --- |
| Action | `Button`: `variant="default"`, `size="default"` | CSS supplies hover, press, focus and disabled. Use `SubmitButton` for pending forms. |
| Alternative / destructive action | `secondary` (`outline` is an alias), `ghost`, `destructive` | Confirm consequential changes with `ConfirmDialog`; critical tone starts focus on Cancel. |
| Safe action that must not fire on a stray click | `HoldButton` (`components/ui/hold-button.tsx`): `variant="secondary"`, or `"default"` for a top-bar action | Hold 600ms to confirm. See [Hold to confirm](#hold-to-confirm). |
| The same, on a phone or tablet | `SwipeConfirm` (`components/ui/swipe-confirm.tsx`) | Drag to the end to confirm. See [Hold to confirm](#hold-to-confirm). |
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
- `ListToolbar` (`components/ListToolbar.tsx`): Paper "Table toolbar" on every
  list. Filter (`FilterMenu`) and the active chips (`FilterChips`, "Payment · is
  any of · Unpaid, Part paid" with a clear button) on the left, `SearchField`
  (28px, "/" hint) on the right. Phones put a full-width Filter, then search,
  then the chips on their own rows. `useSetListSearch` keeps filters and search
  in the URL. Each screen keeps its own filter groups and query params.
- `ListPager`: the range and page buttons under a redesigned list. It is also the
  footer of the new `ListTable`.
- `TableState`: a list with no rows. Paper "Table · Empty" keeps the header band
  and fills a grey panel with generic skeleton lines that fade in an oval toward
  the message; "No results" shows the panel alone, with Clear search or Clear
  filters. List header bands and rows start on the content edge.
- `FormNotice`: a form's failed request in one bordered line (red icon, title,
  staff sentence). The fields keep their values.
- `useCheckIn` (`features/check-ins/CheckInFlow.tsx`): checks a member in and
  shows the toast or the denial dialog. The member page and ⌘K use it.
- `ConfirmDialog`: one consequential decision with pending handling.
- `Field` plus `FailureNotice`: field errors and request failure at separate levels.

See the component source for exact props. Only document or use built variants.
A data block's parent owns loading, empty and failure branches; presentational
pieces do not each need their own request.

### Hold to confirm

`HoldButton` sits between a plain button and `ConfirmDialog`. The user presses
and holds for 600ms while a fill sweeps across the button. Space and Enter hold
the same way. Releasing early, or moving off the button, drains the fill in
200ms and shows the `holdLabel` hint ("Hold to check in") for 1.5s. There is no
error color and no shake. A click from a screen reader or switch control
(`detail` 0, or no mouse, touch or pen) confirms at once, because those users
cannot hold. The action stays the accessible name; the hint is the description.
Reduced motion drops the scale and the sweep; the fill fades in instead.

`fill` picks how the hold shows progress, as in Paper "B · Variants":
`sweep` (default) fills the button; `dots` fills it with dither dots, for pages
that already use dotted bars; `ring` closes a ring around an icon, for row
actions with no room for a label (name it with `aria-label`); `line` runs a 2px
line under the label. `shortcut="c"` holds the button while C is held anywhere
on the page, under the single-key rules in `lib/shortcuts.ts`; pair it with
`line`. A tap of the key does nothing and shows the hint.

`SwipeConfirm` (`components/ui/swipe-confirm.tsx`) is the touch form for phone
and tablet check-in: drag the knob to the end. A release before 90% springs it
back over `--duration-spring` (250ms). The knob is a button named for the
action; holding Space or Enter slides it across over 600ms, and a click from
assistive tech confirms at once.

After the hold, the button shows `confirmedLabel` in the success color until
the Promise from `onConfirm` settles. `onConfirm` owns its failure path, such
as `FormNotice` or a toast.

Use it for safe actions that change state: check in, mark attended, publish a
program, send an invoice. Keep `ConfirmDialog` for destructive, money-out, bulk
and input-taking actions. Before a screen swaps a dialog for a hold, it needs
an Undo, or its issue must say why it does not. Design: Paper page
"Experimental — Hold to confirm".

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
moves to the redesign. The reference is the Paper file "Flowfokus Design", which
replaces the earlier file "Flowfokus Redesign" (its "Member details page" and its
component boards). Colors, type, radius, and icons now follow the new file; see
Colors, Typography, Shapes, and Icons above. The layout notes below still apply
until a screen moves to the new file.

Layout:

- Use one white surface inside the window. Separate sections with spacing and headings, not cards.
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
- Take greys and status colors from the tokens (Colors above): zinc, not the
  Tailwind neutral greys of the earlier file.
- Use the radius tokens (Shapes above). Circles keep their shape; checkboxes
  and square tiles under 20px use 4px.
- Draw progress bars solid by default. A dotted pattern is an optional variant.
- Put one 16px grey icon on each section title. Keep list rows as plain text.
- Show status as a colored 16px icon with grey text, such as a green pie for
  "Renews in 29d 16h" and a red pie for "Ends in 27d 23h · Cancelled".
- Use 28px buttons with shortcut keys (C, S, B, ⌘K). Do not put a search field
  in the app chrome. Search opens from ⌘K.

## Redesign foundation

The tokens and the shell now follow the redesign. Screens that have not moved
still use their older components on the new palette.

Tokens. `tokens.css` maps the Paper tokens to the existing roles; the table
is in Colors above. Redesigned screens use `--text-lg` (20px, semibold) for the
page title, `--text-sm` (13px) for body text and headings, and `--text-xs` (12px)
for secondary text. The base `h1` is 20px. Geist is the font, as in Paper.
Numbers use its equal-width figures.

Controls. `Button size="compact"` (and `"icon-compact"`) is the 28px redesign
button with a 6px radius (`--control-height-compact`, `--radius-compact`). A
compact secondary button has a hairline and a 1px drop (`--shadow-control`).
Coarse pointers grow it to 40px. `Kbd` shows a key hint inside a button; put
`aria-keyshortcuts` on the button. Touch screens hide the hints. Show a hint
only where the shortcut works (`lib/shortcuts.ts`).

Shell (`routes/$org/route.tsx`, styles in `styles/shell.css`, pages in
`lib/pages.ts`). From 768px the app is a rounded window panel (`--radius-window`,
14px, `--shadow-window`) on a tinted frame (`--color-frame`, 24px of it from
1181px and 12px on a tablet), as in Paper "Window". The main column scrolls
inside the window; the router restores its scroll (`data-scroll-restoration-id`).
Phones drop the frame and scroll the page. Paper's decorative glow and glyph
field behind the window are not built.

- Sidebar: 232px, `--color-sidebar` (a slightly darker tone than the window),
  with a hairline on its right edge. It holds the logo and the collapse button,
  one list of pages, and the account control at the foot. Items are 30px; the
  selected item has `--color-selected`, ink text, and an ink icon.
- Pages, in order: Calendar, Members, Sales, Programs, Products
  (`PAGES` in `lib/pages.ts`). Calendar uses the calendar icon and opens
  `/<org>/schedule` until the Calendar issue (#91) renames the route. A role
  sees only the pages it can read: Calendar and Programs need `programs:read`,
  Members `members:read`, Sales `purchases:read`, Products `products:read`. ⌘K
  lists the same pages. Rails still checks every request.
- Account control: initials and name in a 36px well. Its menu holds Settings,
  Keyboard shortcuts, Theme, and Sign out. The role shows in the organization
  switcher.
- Top bar: 52px with a hairline under it. Breadcrumb: organization, location,
  section, and page, then Search with its ⌘K hint, the page's actions, and the
  page's ⋯ menu. The organization and location crumbs open their switchers
  (`ContextSwitcher`); the location list ends with Manage locations. A detail
  route names its page with `staticData.crumb(loaderData)`.
- Page actions show their letter on the button (`Kbd`, with `aria-keyshortcuts`):
  Check in C and Sell S (member page), New member N (members list), Record
  payment P and Fulfill F (sale page), Add sessions T, Sell ticket S, and Book
  member B (program page), Book member B (session page), Sell S and Edit E
  (product page). A letter works only where its hint shows
  (`lib/shortcuts.ts`); the Keyboard shortcuts sheet lists the ones the role can
  use. Pages put their own ⋯ menu at the end of the actions; a page with no
  extra actions has none.
- Start page: `/<org>` and the old URLs of removed pages open the first page in
  the sidebar the role can read (`startPage` in `lib/pages.ts`). A role that
  can read none opens Settings.
- Phones: the top bar holds the two switchers and Search. The tab bar
  (`components/TabBar.tsx`) holds Calendar, Members, Sales, and More, which
  opens the drawer; a role without a page has no tab for it. The rail is 56px
  wide on a tablet and when staff collapse the sidebar; icons stay at x=28.

Shell decisions, 21 November 2026 (issue #86):

- The location crumb shows on every page, including Calendar. Paper's Calendar
  frames leave it out, but sessions belong to a location and the switcher must
  stay reachable. Settings has no location crumb, as in Paper.
- A page with no extra actions has no ⋯ button. Paper's frames show one on
  every page, but a menu with nothing in it would be a control that does
  nothing.
- The account menu keeps Keyboard shortcuts beside Settings, Theme, and Sign
  out, because the sheet is a working feature with no other way in on touch.
- The switcher buttons keep a small chevron. Paper has none, but it is the only
  sign that a crumb opens a list.
- Labels stay as the screens have them ("New member", "Fulfill"). Paper's "Add
  member" and "Fulfill items" are screen wording for the Members and Sales
  issues.

## Shared parts (issue #87)

The redesigned screens share a small set of parts. Each is in the gallery
(`localhost:4001/components`) with its states: default, hover, focus, selected,
empty, and loading. Sizes and colours come from the Paper pages Members,
Session details, Member details, Sale details, Program details, Product
details, and Pass credits. The screen issues (#88 to #94) move each screen onto
them. Until then the older `ListToolbar`, `FilterChips`, `ListPager`, and
`TableState` stay as they are, and the existing screens use them. The Members
list is the first screen on the new parts (#88). The new parts add no sample
data to a screen; the gallery examples carry labelled sample data.

Code: `components/parts/` (`ListTable`, `FilterBar`, `DetailLayout`,
`Activity`, `Backdrop`, `marks`), the ui-sdk wrappers `components/ui/popover`,
`segmented-control`, and `collapsible` (part of #69), rules in `lib/list-parts.ts`
and `lib/paging.ts`, styles in `styles/parts.css`.

| Part | Rule |
| --- | --- |
| List table (`ListTable`, `ListTableBody`, `ListTableRow`, `ListTableCell`) | Table roles on a grid. Column labels are 12px muted text on a 30px header with one hairline. Rows sit flush with the content edge: no grey band, no row dividers, no inset. Two-line rows are 56px (a list page); one-line rows are 44px (a detail page). A sortable header is a button; its `columnheader` has `aria-sort`, and only the sorted column has one. The count and pager under a list page are the existing `ListPager`. A list inside a detail page loads more on scroll (`LoadMore`, with a button for keyboard users; `loaded` re-arms the trigger after each append, and Show more is free again when the promise `onLoadMore` returns settles, also on failure). Loading is skeleton rows in the same columns (`ListTableLoading`); empty is `ListTableEmpty` under the labels. |
| Row selection | `ListTable selection` adds a checkbox column and a header box (none, mixed, all). Chosen rows get `--color-selected`. Adjacent chosen rows merge into one band: `bandPositions` gives each row first, middle, last, or alone, so only the outer corners round (8px). Shift-click chooses a range. `SelectionBar` floats at the bottom with "2 selected" and the bulk actions; a live region announces the count, and Escape in the bar clears it. |
| Collapsible groups (`ListGroup`) | A 36px heading button with a chevron, a mark, a label, and a count: "Here 2", "To arrive 9", "Fulfilled 1". The group is a ui-sdk Collapsible, so the button has `aria-expanded`. |
| Filter bar (`FilterBar`) | A Filter button, then a chip per filter, then search (`SearchField`, with its "/" hint) and Display on the right. A chip reads field, operator, value, remove. A click on the operator flips "is" and "is not", or "is any of" and "is none of" (`filterOperator`, `toggleOperator`); there is no operator menu. The value opens the same checkbox list as the Filter menu. The filter state is `ActiveFilter[]` ({ field, values, negated }). With no `fields`, the Filter button is left out and search and Display remain (the Members list, until Rails has member filters). |
| Display popover (`DisplayPopover`) | Sort by with a direction button, one toggle, column chips (`aria-pressed`), and "Reset to default" (dimmed and inert at the default, but still focusable). A ui-sdk Popover with `modal="trap-focus"`: focus moves in, Escape closes, and focus returns to the Display button. |
| Segmented control (`ui/segmented-control`) | Two to four views where one is chosen: All, Comments, Activity. One tab stop, arrow keys between items. |
| Detail layout (`DetailLayout`) | A main column (28px top, 36px sides, 40px between sections) and a 296px right panel. Below 1100px the panel sits under the main column. The panel holds `PanelGroup` (a grey 12px title) with `PanelRow` label and value rows (96px label), and `PanelAddGroup` for Tags and Notes with a "+" button. Leave the button out when the person cannot add. |
| Hero (`DetailHero`) | A 44px tile (`HeroTile`: initials or an icon), the title (24px, or `size="display"` for a program or session at 36px), one muted line, and up to two stats on the right. `HeroStats` is the stats alone: the Members list shows its count with it. |
| Activity (`ActivityFeed`) | A comment box (`CommentComposer`, ⌘↵), the All, Comments, Activity control, event rows with a coloured dot, comment rows with a 24px avatar, and "Show N earlier events". Rails has no comments yet, so a screen leaves the composer out and shows events only; the control then hides too. |
| Background pattern (`RecordBackdrop`, via `DetailLayout record`) | One faint pattern per record: glyph dots (member), ledger rules (sale), orbit dots (program), clock ticks (session), barcode (product). Drawn from the Paper "Atmosphere" frames in `--color-pattern`. Decoration: `aria-hidden`, no pointer events, hidden under `prefers-contrast: more`. |
| Status marks (`StatusMark`, `TimeMark`) | A ring or pie with its label: Paid, Partly paid, Unpaid, Fulfilled, Partly fulfilled, Unfulfilled (the icon set), and Renews or Ends (a pie of the time left). The label is the word Rails returns (#14 is open). Payment, fulfillment, and access stay separate marks. `boxed` is the pill of a hero. |
| Credit ring (`CreditRing`) | "7 of 10 left" with a ring. Amber at two or fewer left, and at none. |
| Spot stack (`SpotColumn`, `SpotRow`, `SpotKey`) | One slanted segment per spot: booked is ink, open is faint, full is amber, past is grey, and a cancelled session is a red cross. Chart size is a 10px column per session; row size is 60 x 12 for twelve spots. Put the count beside it as text. |
| Mix bar (`MixBar`) | Slanted stripes sized by share, darkest first. Put the numbers beside it as text. |
| Tag chip (`TagChip`) | A 20px pill with a 6px dot (`DotTone`: neutral, good, warning, critical, info, violet) and the tag name. The dot never carries the meaning alone. |

Differences from Paper, and why:

- Inactive column labels use `--color-ink-3` (Paper's #A1A1AA is 2.6:1 on white).
  The sorted label uses `--color-ink-2`.
- The row checkbox is 14px with an ink fill, as in Paper. Other checkboxes keep
  their 20px accent fill.
- The selected band is `--color-selected` (black 5% in light, white 10% in
  dark). Paper's frame is light and draws ink at 5%; the dark value follows the
  token.
- Paper's comment box shows attach and mention icons. They do nothing yet, so
  they are not built.
- The patterns are drawn in `--color-pattern` (zinc 600 in light, zinc 500 in
  dark) with the alpha of the Paper SVGs. They are faint in both themes by design.
- Paper's group heading uses a dashed ring for "To arrive". The icon set has
  `unfulfilled` (a dashed ring), so groups use that icon.
- A hero's tile is a gradient from `--color-raised` toward a 4% ink tint, not
  Paper's literal #FFFFFF to #F4F4F5, so it follows both themes.

Keyboard and screen reader checks (run in the gallery, recorded in
[Frontend preview](../../docs/frontend-preview.md)): Tab reaches each sort
button, row checkbox, chip operator, value, and remove button in reading order;
Space toggles a checkbox or presses a button; the Display popover keeps focus
inside and Escape returns it; the selection count and the bulk bar are announced
by a live region.

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

The members list and New member are redesigned screens
(`features/members/MembersList.tsx` and `NewMember.tsx`, helpers in
`features/members/list.ts`). They show only Rails data:

- Members list (issue #88, Paper "Members"): the title with the member
  count on the right (`HeroStats`; a search hides it, because Rails then
  returns only the matches), New member in the top bar (it and its N key need members:create and members:read),
  and a filter bar with search (a "/" hint; Rails searches name and email as
  staff type; Escape clears) and Display. Then the list table: a 30px label
  row with Member and Member since as sortable headers, and 56px two-line rows
  with initials, name, and the email under it, then the join date. Each row
  opens the member (one link covers the row). The footer reads "1–50 of 186
  members" and pages 50 at a time. Sorting, columns, and paging work on the
  rows Rails returned, in the page; the URL keeps only `q`. Display has Sort by
  (Name or Member since; newest first is the start) and the chips Member
  since and Email (the line under the name), with Reset to default. The page
  shows the faint glyph-dot pattern behind the header.
  Left out, because Rails cannot supply them (issue #17): the Filter button
  and its fields (Status, Product, Tag, Home location, Ends, Balance), Show
  ended members, the balance due stat, the Holds, Spent, and Balance due
  columns, tags, member numbers, phone, and bulk actions. The Filter button
  returns when a filter field is real: `FilterBar` leaves it out when `fields`
  is empty.
- No results: the label row, one line, and Clear search. No members: the label
  row, one line, and New member. Loading: skeleton rows in the same columns.
  A load error: the label row and the failure notice.
- New member: a page, not a dialog. An icon tile and the title, Create member
  (⌘↵) in the top bar, then the Profile band with Full name and Email.
  Email is required because Rails requires it. Errors show on the fields, with
  a summary above. Leaving with typed details asks "Discard this member?".
  After a create, the member page opens with a "Member created" toast. The
  toast has no New sale action; Sell (S) is on the member page.

The sales list and sale details are the next redesigned screens
(`features/sales/SalesList.tsx`, `SaleDetails.tsx`, and `SaleDialogs.tsx`;
facts, filters, and action rules in `features/sales/facts.ts`). They share the
list pieces in `components.css` (`.list-toolbar`, `.list-search`, `.list-pager`,
`.list-state`), `ListToolbar`, and `ListPager` with the members list. They show only Rails data:

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

The check-in flow (`features/check-ins/CheckInFlow.tsx`, facts in `facts.ts`,
idempotency in `attempt.ts`, member search in `useMemberSearch.ts`) has no page
of its own. The Check-ins page left the product on 21 November 2026. The member
page (Check in, or C) and ⌘K (Check in, for the first member found) start it.
It shows only Rails data:

- Check in records the visit at the top bar location at once. The result is
  a toast. A failed request shows an error toast with Try again, which
  resends the same idempotency key. A denial opens the denial dialog: the
  access fact from the Rails reason, the balance due when the role can read
  sales, then New sale (no access) or Renew (no visits left). "Let in
  anyway…" (check_ins:override) asks for a reason and lets the member in with
  the neutral primary button.
- No location: an error toast names the organization and says to add one.
- No check_ins:create: no Check in.
- Not shown, because Rails has no data for them: the right used, credits
  used, access hours, the cause behind "no active access", Undo, member
  numbers and phones, and walk-ins.

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

Programs, Program details, and New program are the next redesigned screens
(`features/programs/ProgramsList.tsx`, `ProgramDetails.tsx`,
`ProgramForm.tsx`, and `ProgramDialogs.tsx`; facts in `facts.ts`, kind
tiles in `kinds.tsx`, publishing in `publish.ts`, styles in
`styles/programs.css`). They show only Rails data:

- Programs: the title, New program (programs:manage) in the top bar, Filter
  (Kind, Visibility, with counts and chips) and a "/" search over names and
  hosts. A header band, then 52px rows: the kind tile (the set's groupClass, event,
  and appointment icons), the name with Staff only, kind and length (and the location when
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
  General, Locations, and Staff, then Notifications under
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

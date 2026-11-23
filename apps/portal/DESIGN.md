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
`HoldButton` uses `--duration-hold` (600ms, `--ease-in`) and `--duration-drain` (200ms).
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
credit rings (`components/parts/marks.tsx`) and the session status marks
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
| Navigation styled as an action | Router `Link` with `buttonVariants()` | Keep link semantics; do not nest a button in a link. |
| Status | `Status state={…}` with visible label | Use the current response, not the requested outcome. `Pill` defaults to neutral for other labels. |
| Form field | `Field`, `describedBy`, `ui/input`, `ui/native-select` | Match input ID to field ID. Link hint/error IDs and set `aria-invalid`. |
| Section | `Plate` (also exported as `Card`) | Title names the section. `flush` fits a table; `footer` holds totals or actions. |
| Feedback | `Notice` defaults to info; `FailureNotice` displays API failures | Use `live` for changed feedback, not every static notice. Error text gives a next step. |
| Collection state | `LoadingState`, `Empty`, `ErrorState` | Loading reserves space; empty describes no records; error describes a failed load. |

Good: sales rows use two `StatusMark`s from `saleMarks`
(`features/members/facts.ts`). Payment (Paid, Part paid, Unpaid, Void) and
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
- `StatusMark` with `saleMarks`: a sale's two facts, on the sales list, sale page, and member page.
- `ListToolbar` (`components/ListToolbar.tsx`): Paper "Table toolbar" on every
  list. Filter (`FilterMenu`) and the active chips (`FilterChips`, "Payment · is
  any of · Unpaid, Part paid" with a clear button) on the left, `SearchField`
  (28px, "/" hint) on the right. Phones put a full-width Filter, then search,
  then the chips on their own rows. `useSetListSearch` keeps filters and search
  in the URL. Each screen keeps its own filter groups and query params.
- `ListPager`: the range and page buttons under a redesigned list. It is also the
  footer of the new `ListTable`.
- `FormNotice`: a form's failed request in one bordered line (red icon, title,
  staff sentence). The fields keep their values.
- `ConfirmDialog`: one consequential decision with pending handling.
- `Field` plus `FailureNotice`: field errors and request failure at separate levels.

See the component source for exact props. Only document or use built variants.
A data block's parent owns loading, empty and failure branches; presentational
pieces do not each need their own request.

### Hold to confirm

`HoldButton` sits between a plain button and `ConfirmDialog`. The user presses
and holds for 600ms while a fill sweeps across the button. Space and Enter hold
the same way. Releasing early, or moving off the button, drains the fill in
200ms and shows the `holdLabel` hint ("Hold to confirm") for 1.5s. There is no
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

After the hold, the button shows `confirmedLabel` in the success color until
the Promise from `onConfirm` settles. `onConfirm` owns its failure path, such
as `FormNotice` or a toast.

Use it for safe actions that change state: mark attended, publish a
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
  details sit on that page. Sell and Renew start there.
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
compact secondary button has a hairline and a soft drop (`--shadow-control`).
Its text starts 10px from the edge. A leading icon is 14px, 8px from the edge
and 6px from the text; on a secondary button it is `--color-ink-2`. A key hint
sits 8px after the text and 6px from the edge.
Coarse pointers grow it to 40px. `Kbd` shows a key hint inside a button: 11px
text in a 16px tile with a 4px radius; put
`aria-keyshortcuts` on the button. Touch screens hide the hints. Show a hint
only where the shortcut works (`lib/shortcuts.ts`).

Shell (`routes/$org/route.tsx`, styles in `styles/shell.css`, pages in
`lib/pages.ts`). From 768px the app is a window that fills the viewport, edge to
edge, with no frame, corner radius, or shadow. Paper "Window" draws it inset on a
tinted artboard; the built app does not. The main column scrolls inside the
window; the router restores its scroll (`data-scroll-restoration-id`). Phones
scroll the page.

- Sidebar: 232px, `--color-sidebar` (a slightly darker tone than the window),
  with a hairline on its right edge. It holds the logo and the collapse button,
  one list of pages, and the account control at the foot. Items are 30px; the
  selected item has `--color-selected`, ink text, and an ink icon.
- Pages, in order: Calendar, Members, Sales, Programs, Products
  (`PAGES` in `lib/pages.ts`). Calendar uses the calendar icon and opens
  `/<org>/calendar`. A role
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
  Sell S (member page), New member N (members list), New sale N (sales list),
  New program N (programs list), New product N (products list), Record
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
  stay reachable.
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
them. The older `ListToolbar` (still the Calendar's Filter and search, and the
search field of every list), `FilterChips`, and `ListPager` (the footer of every
list) stay as they are; `TableState` is gone. The Members
list is the first screen on the new parts (#88); the Sales list (#90) and the Products list (#93) follow. The new parts add no sample
data to a screen; the gallery examples carry labelled sample data.

Code: `components/parts/` (`ListTable`, `FilterBar`, `DetailLayout`,
`Activity`, `Backdrop`, `marks`), the ui-sdk wrappers `components/ui/popover`,
`segmented-control`, and `collapsible` (part of #69), rules in `lib/list-parts.ts`
and `lib/paging.ts`, styles in `styles/parts.css`.

| Part | Rule |
| --- | --- |
| List table (`ListTable`, `ListTableBody`, `ListTableRow`, `ListTableCell`) | Table roles on a grid. Column labels are 12px muted text on a 30px header with one hairline. Rows sit flush with the content edge: no grey band, no row dividers, no inset. Two-line rows are 56px (a list page); one-line rows are 44px (a detail page). A sortable header is a button; its `columnheader` has `aria-sort`, and only the sorted column has one. The count and pager under a list page are the existing `ListPager`. A list inside a detail page loads more on scroll (`LoadMore`, with a button for keyboard users; `loaded` re-arms the trigger after each append, and Show more is free again when the promise `onLoadMore` returns settles, also on failure). Loading is skeleton rows in the same columns (`ListTableLoading`); empty is `ListTableEmpty` under the labels. A row that no bulk action covers is `unselectable`: it keeps the checkbox column and shows no box, so the columns line up (Session details uses it for members already checked in). A row takes `onKeyDown` and `onContextMenu` for a row shortcut and a row menu. |
| Row selection | `ListTable selection` adds a checkbox column and a header box (none, mixed, all). Chosen rows get `--color-selected`. Adjacent chosen rows merge into one band: `bandPositions` gives each row first, middle, last, or alone, so only the outer corners round (8px). Shift-click chooses a range. `SelectionBar` floats at the bottom with "2 selected" and the bulk actions; a live region announces the count, and Escape in the bar clears it. |
| Collapsible groups (`ListGroup`) | A 36px heading button with a chevron, a mark, a label, and a count: "Here 2", "To arrive 9", "Fulfilled 1". It has no side padding, so the label starts 44px in, in line with the row titles. The group is a ui-sdk Collapsible, so the button has `aria-expanded`. |
| Filter bar (`FilterBar`) | A Filter button, then a chip per filter, then search (`SearchField`, with its "/" hint) and Display on the right. A chip reads field, operator, value, remove. A click on the operator flips "is" and "is not", or "is any of" and "is none of" (`filterOperator`, `toggleOperator`); there is no operator menu. The value opens the same checkbox list as the Filter menu. The filter state is `ActiveFilter[]` ({ field, values, negated }). With no `fields`, the Filter button is left out and search and Display remain (the Members list, until Rails has member filters). |
| Display popover (`DisplayPopover`) | Sort by with a direction button, one toggle, column chips (`aria-pressed`), and "Reset to default" (dimmed and inert at the default, but still focusable). A ui-sdk Popover with `modal="trap-focus"`: focus moves in, Escape closes, and focus returns to the Display button. |
| Segmented control (`ui/segmented-control`) | Two to four views where one is chosen: All, Comments, Activity. One tab stop, arrow keys between items. |
| Detail layout (`DetailLayout`) | A main column (28px top, 36px sides, 40px between sections) and a 296px right panel. Below 1100px the panel sits under the main column. The panel holds `PanelGroup` (a grey 12px title) with `PanelRow` label and value rows (96px label), and `PanelAddGroup` for Tags and Notes with a "+" button. Leave the button out when the person cannot add. |
| Hero (`DetailHero`) | A 44px tile (`HeroTile`: initials or an icon), the title (24px, or `size="display"` for a program or session at 36px), one muted line, and up to two stats on the right. Pills sit 6px under the title. A figure is 18px on a 24px line. A stat with `above` puts its label over the figure ("Starts in" over "20 min"); with a display title, a lone stat is 28px on 32px, 4px from its label. A display hero has 12px more above it, so the title sits 40px under the top bar, and its stat sits on the title's last line. `HeroStats` is the stats alone: the Members list shows its count with it. |
| Activity (`ActivityFeed`) | A comment box (`CommentComposer`, ⌘↵), the All, Comments, Activity control, event rows with a coloured dot, comment rows with a 24px avatar, and "Show N earlier events". Rails has no comments yet, so a screen leaves the composer out and shows events only; the control then hides too. |
| Background pattern (`RecordBackdrop`, via `DetailLayout record`) | One faint pattern per record: glyph dots (member), ledger rules (sale), orbit dots (program), clock ticks (session), barcode (product). Drawn from the Paper "Atmosphere" frames in `--color-pattern`. The 864 × 560 drawing is pinned to the top right of its page and the box spans the page, so the strong part stays in view at every width; a left fade hides the cropped edge. When the detail panel sits beside the main column (1100px and up), the pattern stays behind the main column and leaves the panel clear. A list page (`.page`) shows a 176px band that has faded out where the first row starts. Decoration: `aria-hidden`, no pointer events, hidden under `prefers-contrast: more`. |
| Status marks (`StatusMark`, `TimeMark`) | A ring or pie with its label: Paid, Partly paid, Unpaid, Fulfilled, Partly fulfilled, Unfulfilled (the icon set), and Renews or Ends (a pie of the time left). The label is the word Rails returns (#14 is open). Payment, fulfillment, and access stay separate marks. `boxed` is the pill of a hero. |
| Credit ring (`CreditRing`) | "7 of 10 left" with a ring. Amber at two or fewer left, and at none. |
| Spot stack (`SpotColumn`, `SpotRow`, `SpotKey`) | One slanted segment per spot: booked is ink, open is faint, full is amber, past is grey, and a cancelled session is a red cross in the chart and a flat faint line in a row. Chart size is a 10px column per session (16 spots at most); row size is 72 x 10 for twelve spots, a 3.72px mark every 6px (20 at most). A larger session is drawn smaller: it never shows full unless it is, and never shows empty with a booking. Put the count beside it as text. |
| Mix bar (`MixBar`) | Slanted stripes sized by share, darkest first. Put the numbers beside it as text. |
| Allowance bar (`AllowanceBar`) | What a benefit allows: one slanted segment for each visit or booking, or one solid slanted bar for unlimited (and for more than 20). It is 96 x 12 with a segment every 8px; more than twelve segments make it wider. The amount sits beside it as text. |
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
- A tile is a gradient that is lighter at the top in both themes
  (`--gradient-tile`). The light stops are `--color-raised` and a 4% ink tint,
  not Paper's literal #FFFFFF and #F4F4F5. The dark stops are Paper's #2A2A2F
  and #1B1B1F, with a white 12% ring and a 1px white 8% highlight on the top
  edge (`--shadow-tile`).
- The switch has Paper's size: 34 by 20, 2px padding, a 16px thumb with a soft
  drop, and no border. Its off track is `--color-field-line`, not Paper's
  #E4E4E7, which is 1.3:1 on the page. A control boundary needs 3:1.
- The pager's range and the key hints use `--color-ink-3`, the darker muted
  text, not Paper's #71717A.

Keyboard and screen reader checks (run in the gallery, recorded in
[Frontend preview](../../docs/frontend-preview.md)): Tab reaches each sort
button, row checkbox, chip operator, value, and remove button in reading order;
Space toggles a checkbox or presses a button; the Display popover keeps focus
inside and Escape returns it; the selection count and the bulk bar are announced
by a live region.

Member details (issue #89, Paper "Member details", light and dark) is on the
shared parts (`features/members/MemberDetails.tsx`; facts in
`features/members/facts.ts`; the Horizon in `Horizon.tsx` and `timeline.ts`;
styles in `styles/members.css`). It shows only Rails data. Paper could not be
read while it was built (the Paper server timed out), so the layout, order, and
content follow the saved light screenshot, and every size and colour comes from
the tokens and shared parts built from Paper in #85 and #87.

- Hero: the initials tile, the name, "Member since Nov 2026", and two stats
  from the member's sales: "paid" (money received less refunds, the old Total
  paid) and "balance due" (sales that are not void). Paper's "spent" is not a
  Rails field, so the label stays "paid". With 100 sales, the most Rails
  returns, the stats are left out, because the sums would be partial.
- Top bar: Sell (S, the primary button, purchases:create; it and its key
  were open to every role before). The more
  menu holds Renew membership (purchases:create, when Rails returns renewal
  terms) and Create link code or Unlink sign-in (members:link). A role with
  none of these sees no menu. A link code opens in a dialog that stays until
  staff close it, because Rails shows the code once. There is no Edit action
  yet: Rails has no member update endpoint, and the page never had one.
- Horizon: a line of the last week and the next 30 days with today, bookings
  (rings ahead, small dots behind), and the end of each membership period or
  pass. The window is always the last 7 and the next 30 calendar days in the
  organization's time zone, so a clock change does not shift it. A period
  followed by another one adds no end mark, because Rails has no "renews"
  state. A right's end always shows: Rails does not say which period gave a
  right. Labels alternate above and below; one that would overlap is left out
  (its mark stays), and "Show all N events" lists every mark with its date.
  The section is left out when nothing but today is in the window.
- Holds: one row per membership period and per access right, with Rails dates
  and the words the page had before (#14 is open): "Ends in 29d 16h",
  "Starts in 2d", "Ended 3 Nov", "Revoked", "Starts 21 Dec", "Unlimited visits",
  and the credit ring "3 of 10 left" for a counted right. A period links to its
  sale. Rows that are over show under View all.
- Recent sales: product and date, Paid and Fulfilled as two separate marks, the
  payment method, and the amount with any balance due or refund under it. Left
  out: the sale number, which Rails does not return.
- Bookings: program, day and time range, the right it uses (or Ticket, or Held
  for payment), and how soon ("In 1d 16h") or its status. Left out: the
  location, which a booking does not carry.
- Activity: the shared feed with real events (sales, payments,
  fulfillments, refunds, voids, bookings, and the join date). No comment box,
  and no All, Comments, Activity control: Rails has no comments.
- Contact (the right panel): email and the gym site link state. Left out:
  tags, phone, emergency contact, home location, and notes (issue #17).
- Empty lists say so in one line. A member with nothing keeps the hero, the
  stats at zero, and the empty sections.
- On a phone the panel moves under the main column, and each row wraps: the
  main figure stays on the first line, the marks go under it.
- Layout: `DetailLayout` fills the window (`.main:has(> .detail)` drops the main
  column's own padding) and pads its own sides. Sections share `Section`
  (`features/members/Section.tsx`): a 32px header with a 12px medium title in
  `--color-ink-2` and View all, then flush rows with no gap. Paper's Member
  frame draws this header 24px high and its Sale and Product frames 32px; the
  portal uses 32px everywhere, so a header with a button and one without line
  up. The list table keeps its label row for assistive technology and hides
  it on screen with `list-table--bare`.

List pages (Members, Sales, Programs, Products) share one layout, read from the
Paper frame "Members" (issue #128). The content has 36px at the sides. The
title is 36px on a 40px line and sits 40px under the top bar; the count sits
on the title's last line, 3px up. Then 32px to the toolbar, 20px to the table,
and 24px to the pager. The search field is 240px wide. The pager's buttons are
28px, 8px apart; the current page is a white tile with a hairline and a soft
drop. The New button in the top bar has text and its N hint, without a plus
icon. Display's Sort by is a 26px control with 6px between the value and its
12px chevron; a column chip that is on has a 6% ink fill and a 15% ink line.

The members list and New member are redesigned screens
(`features/members/MembersList.tsx` and `NewMember.tsx`, helpers in
`features/members/list.ts`). They show only Rails data:

- Members list (issue #88, Paper "Members"): the title with the member
  count on the right (`HeroStats`; a search hides it, because Rails then
  returns only the matches), New member in the top bar (it and its N key need members:create and members:read),
  and a filter bar with search (a "/" hint; Rails searches name and email as
  staff type; Escape clears) and Display. Then the list table: a 30px label
  row with Member and Member since as sortable headers, and 56px two-line rows
  with initials, name, and the email under it, then the month and year the
  member joined ("Feb 2025"). Each row
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
- New member: a page, not a dialog, on the same record frame as Member details
  (glyph dots, `DetailHero` with an icon tile, and a `Section`). Create member
  (⌘↵) in the top bar, then the Profile section with Full name and Email, two
  fields per row (12px labels, 13px values, 32px fields).
  Email is required because Rails requires it. Errors show on the fields, with
  a summary above. Leaving with typed details asks "Discard this member?".
  After a create, the member page opens with a "Member created" toast. The
  toast has no New sale action; Sell (S) is on the member page.

The sales list, Sale details, and New sale (issue #90, Paper "Sale details", light
and dark) are on the shared parts (`features/sales/SalesList.tsx`,
`SaleDetails.tsx`, `NewSale.tsx`, and `SaleDialogs.tsx`; facts, filters, sorting,
and action rules in `facts.ts`; the draft rules in `saleDraft.ts`; styles in
`styles/sales.css`). They show only Rails data. Paper could not be read while
they were built (the Paper server timed out), so the layout, order, and content
follow the saved light screenshot of "Sale details — #1058 partly paid", and
every size and colour comes from the tokens and shared parts built from Paper in
#85 and #87. The Sales list and New sale have no Paper frame: the list follows
the Members list (#88) with the Recent sales columns, and New sale follows New
member (#89) with the sale page's rows.

- Sales list: the title with the sale count on the right (`HeroStats`; a filter
  or search hides it, because the count then covers only the matches), New sale
  (N, purchases:create) in the top bar, a filter bar, the list table, and the
  page range. The bar has Filter (Payment: Unpaid, Part paid, Paid, Void;
  Fulfillment: Unfulfilled, Fulfilled, Access revoked, each with a count), a
  chip per active filter, search ("/" hint; member name, email, product, and price
  label), and Display. The columns are Member (initials, name, email), Product
  (name and price label, "Renewal"), Date, Payment, Fulfillment, Method (each
  method once, "—" with no payment), and Amount (the total, with the balance due
  in amber or red, or the refund, under it; a void total is struck through).
  Member, Date, and Amount sort from the header. Display has Sort by (Date, Member,
  Amount; newest first is the start) and the chips Date, Fulfillment, and Method.
  Each row opens the sale. The faint ledger rules sit behind the header. Rows
  switch to the phone layout (member and amount first) when the table is 1024px wide or less; the
  table's own width decides, through a container query, not the viewport. The
  header, with its sort buttons, is `display: none` there, so Tab and screen
  readers skip it; Display sorts.
- The URL keeps `payment`, `fulfillment`, and `q`, as before, plus `payment_not=true`
  and `fulfillment_not=true`. A filter with its `_not` flag is "is not" (or "is none
  of"): each sale's state is tested against the values and kept when it is none of
  them. Without the flag the values mean "is any of". The chip's operator click
  flips the flag and keeps the values, so "is none of" every value shows no sale and
  "is not Fulfilled" keeps void sales. `_not` counts only with values. Old
  `view=due`, `view=deliver`, and `delivery=` links, and plain `payment=` and
  `fulfillment=` links, still work and are "is any of". Rails
  returns the 100 newest sales; the list filters, sorts, and pages 50 at a time in
  the page, and at 100 it says "sales shown" and "100+". No sales: one line and
  New sale. No match: one line and Clear filters or Clear search. Phones put the
  member and amount on the first line, then the product, then the facts.
- Sale details: `DetailLayout` with the ledger pattern. The title and the pills are
  cut out of the rules with a page-colored box as wide as the text, so no rule
  crosses a letter (also on New sale). The hero has the receipt
  tile, the item as the title, and two pills: payment, then fulfillment, in the words
  Rails returns (#14 is open). Rails has no sale number, so the title is the
  product name; "Renewal" is the line under it for a renewal. Items: one group
  (Fulfilled, Unfulfilled, or Access revoked, with a count of one), and its row
  with the icon tile, the name, the terms line (dates once fulfilled, then the
  price that was sold, unless the line already says it), the rights, the guests of
  a ticket (they wrap onto more lines), the unit price and quantity, and the line total, then
  Total. The row keeps 9px free above and below its text, so a row with rights or
  guests grows past 56px; the price columns are 132px and 110px with 12px between.
  Total and Balance due are 44px with their hairline. These sizes, and the medium
  weight of a payment amount, were read from the Paper frame (#130). "Fulfill items" (F) is in the section header while the sale can be
  fulfilled, "Fulfill early" when staff may fulfill it before payment
  (purchases:fulfill_unpaid). Notes under the row say when it was fulfilled early,
  why access ended, or that fulfillment waits for payment, with the link to the
  member's access or the roster. Payments: each payment (method, reference, when,
  refunded part) and each refund (a negative amount), oldest first, then Balance
  due in the warning colour while money is owed. "Record payment" (P,
  payments:create) is in the header while a balance is due. Activity is the
  shared feed with real events (the sale, payments, fulfillment, refunds, void),
  without a comment box or the All, Comments, Activity control. The panel has
  Member (a link), Location (or Channel, Online), and Date.
- Actions: the top bar's ⋯ menu holds Refund…, Revoke access…, and Void sale…,
  each only with its permission and when the sale allows it; with none allowed
  there is no ⋯. Fulfill and Record payment are not in it any more: they are in the
  section headers. F and P work only while their button shows. A void sale shows one
  bordered notice with the reason. Dialogs follow the Paper "Dialogs and menu"
  frame and keep their rules: Record payment offers Cash and Bank transfer and says
  it does not move money. Fulfill states what it creates; with money due it
  becomes Fulfill early and needs a reason. Refund chooses the payment and says
  access stays. Void and revoke need a reason. Phones put the ⋯ on the title's line,
  the unit price and total under the item, and the panel under the page.
- New sale: a page on the same record frame (ledger rules, `DetailHero` with the
  receipt tile and "New sale"), with Create sale (⌘↵) in the top bar. Products and
  Payment are `Section`s on the left; Member and Location are in the right panel
  from 1100px. Narrower screens put them between the title and the sections, and
  Create sale at the end. The page moves the panel and the action in the document
  itself, not with CSS `order`, so Tab follows the screen. Products holds one line, because Rails sells one line,
  quantity one, at the price's current amount; "+ Product" (and Change) opens Add
  product: search, then All, Memberships, and Passes when both are on sale, then
  one choice. Tickets are left out: they are sold for a session time from the
  schedule. Record payment adds Cash or Bank transfer before the sale exists;
  nothing is sent until Create sale, then Rails records the sale, then the payment.
  Balance due turns warning-coloured while money is due. Member is a search of name
  and email; a chosen member shows the name and email with a button to change.
  Sell (S) on a member page and `?member=` start with the member chosen; `?price=`
  starts with the product. Location starts at the desk location. Errors show on
  the member, product, and location. Leaving with a product, a payment, or a
  changed member asks "Discard this sale?". After a create, the sale page opens
  with a "Sale created" toast that says what is due. If the payment fails after the
  sale exists, an error toast says so and the sale page still opens, so staff never
  create the sale twice.
- Not shown, because Rails has no data for them (issue #18): sale numbers, sold
  by, who recorded each payment, who fulfilled, refunded, or voided, sale notes,
  comments, Send invoice, receipts, Renew from the sale page (Renew is on the
  member page), several lines in one sale, fulfillment per line (so one group, not
  a Fulfilled and an Unfulfilled group), custom items, quantity and more than
  one line on New sale, card or e-wallet payments, member numbers and phones, "Add
  new member" from the search, and server-side filters and paging for the list.

Walk-in gym check-in is not in the portal. The member page and ⌘K have no
Check in action, and Rails has no check-in endpoint (issue #81). Staff mark a
booked member as here on Session details only.

Calendar (issue #91, replacing Schedule) and Session details are redesigned
screens. Calendar is `features/calendar/` (`Calendar.tsx`, `Block.tsx`, rules in
`facts.ts`, styles in `styles/calendar.css`); Session details is
`features/schedule/` (`SessionDetails.tsx`, `BookMember.tsx`, `SessionDialogs.tsx`,
facts in `facts.ts`, status marks in `marks.tsx`, styles in `styles/schedule.css`).
They show only Rails data. Paper could not be read while Calendar was built (the
Paper server timed out on every call), so the layout and content follow the
issue and the Paper frame names ("Calendar · K2 · Day, kinds" and "Week, kinds");
sizes and colours come from the tokens and the shared parts. Compare with the
frames before a screen review:

- Route: `/<org>/calendar`, and a session at `/<org>/calendar/<id>`. `/schedule`
  and `/schedule/<id>` redirect. `/<org>` opens Calendar for a role that reads
  programs (`startPage`). The sidebar item and the title are Calendar.
- Toolbar: Previous and Next (a day or a week), Today, the date with the session
  count ("Sun 22 Nov · 6 sessions"), Group by (None, Program, Host), Filter with a
  Program submenu and its chip, and the Day and Week segmented control. Month is
  not built: no frame exists, and the switch holds Day and Week only.
- Kinds row: Classes, Appointments, and Events are toggles (`aria-pressed`) with
  a count. A count is of the sessions the program filter keeps, so it does not
  drop when its own kind is switched off. All three off shows "No sessions match."
  with Clear filters.
- URL: `date` (any day; `week` shows its Monday to Sunday), `view=week`,
  `group=none|program`, `program=<ids>`, and `hide=class,appointment,event`. A
  value that equals its default is left out, so `/calendar` is today, by host,
  with every kind. Group, program, kinds, and view change the URL with `replace`;
  Previous, Next, and Today are links. Only the view and the date reload from
  Rails (`/staff/occurrences` with `from` and `days` of 1 or 7); the rest work on
  the loaded range. Sessions are those at the top bar location.
- Day: one column per group on a 64px hour axis from 06 to 22. It grows to whole
  hours when a session falls outside. A group is a host (`host_name`, with "No
  host" last), a program, or one column for None. Sessions that overlap share the
  column side by side (`placeColumn`). A short session is drawn 30 minutes tall.
  A block says three lines from 55 minutes, two lines (start and name, then status)
  from 40, and one line below that.
  On today, a red now tag and line cross the grid and the time before it is
  washed grey; the wash stops at the foot of the grid, and the line shows only
  while now is inside the axis. The page does not scroll by itself when the day opens.
- Week: one row per group by Monday to Sunday, in the same blocks, one cell per
  day. Today's column is tinted and past days are grey. None is a single row with
  no label.
- Blocks (`CalendarBlock`, in the gallery): a class is a white card with a
  spot stack on the Day grid and "11 of 12" as text; an appointment is flat grey
  and says "Booked" or "Open" (Rails sends no member name); an event is dark and
  says "41 of 50" (spots taken: Rails counts membership bookings and holds too). Full is amber (a class or an event; a booked appointment
  is not full). An ended session is washed out. A cancelled one is a dashed red
  outline with a struck name and "Cancelled · reason". The block names its
  program, or the host under a program grouping, because the column says the
  program. Every block is a link to Session details with a full accessible name.
- Keyboard: the grid has one tab stop, on the active block (the first one until
  an arrow key moves it). Up and Down walk a column or a day cell in time order
  and step to the next row on Week. Left and Right move to the nearest column
  with a session in the same row and pick the one closest in time. Home and End
  go to the ends of the column. When a key has no target that way, Right and Down
  go to the next block in reading order and Left and Up to the previous one, so
  every block is reachable. Enter opens the session. A hint for assistive
  technology describes the keys (`moveFocus` in `facts.ts`).
- Phones and narrow windows (below 768px): the grid is hidden and a list shows
  one band per day with time, program, kind and host, and the status. The list is
  CSS-only, so a screen reader on a wide window reads the labelled grid.
- Not shown, because Rails cannot supply them (issue #20): the booked member's
  name on an appointment (it says "Booked"), staff hosts (a host is the program's
  text), host availability and open times (#99), and the month view.
- Nothing scheduled: one line and "Add sessions from a program". Did not load: one
  line, the reason, and Try again. "Book member" is not in the top bar: Book
  member needs a session, and there is no member-first flow.
- Session details (issue #92, Paper "Session · A3 · Chosen (clock ticks)",
  light and dark): `DetailLayout` with the clock-tick pattern. The hero is
  the date and time at display size ("Tue 24 Nov, 19:00") with one stat on the
  right, "Starts in" over "3 d" (`clockStat` in `arrival.ts`: "Starts in", "Ends
  in" while it runs, "Ended … ago"; none for a cancelled session). Every time
  on the page reads one clock: the route's `loadedAt` for the server render and
  the first browser render, then the browser's own, ticking every 30 seconds
  (`useNow`). A cancelled session shows "Cancelled · reason" under the title
  and no ribbon. Book member (B, primary) and ⋯ (Open program, Cancel
  session… with programs:manage) sit in the top bar while the session is open.
  The breadcrumb is Programs › program › session.
- The arrival ribbon (`ArrivalRibbon.tsx`, rules in `arrival.ts`) is a time
  axis from 30 minutes before the start to the end, with the session hatched on
  it, a Now pin with the time, and the members who are here as 28px initials
  at the time Rails recorded their check-in (`attended_at`), stacked in up to
  three rows so none covers another. The text says "9 to arrive, 1 spot open"
  (once the session is over, "9 not checked in") with one ring per waiting
  member and per open spot, up to 24 rings. Rails records when a member was
  checked in, not when they walked in, so the ribbon shows no one before
  that. A member checked in more than three hours before the start, or more than an
  hour after the end, stays in the list and off the ribbon, so a check-in made
  days ahead does not squeeze the session into a sliver. With no avatars the ribbon is short.
- Bookings are three groups in the shared list table with a selection column:
  Here (checked in, in arrival order, with the time in green), To arrive (booked
  or held, not checked in, with the day it was booked), and Cancelled (cancelled
  or expired; folded unless the session is cancelled or it is all there is).
  The words are Rails' "attended" shown as "Here". A row has a checkbox, a status mark, a 28px initials tile and the name
  (a link to the member), "Guest of …" or "Booked by …" from the holder, what
  happened to a cancelled spot (reason, "Credit returned", "Refund from the
  sale", "Hold expired, payment not received"), the right used (the pass,
  membership, or Ticket) with "Awaiting payment" in amber on a held spot, and
  the time. Phones put the right under the name and show the ⋯ always.
- Check in is on this page only. For a booked member it works three ways: the
  status mark on the row (a click, labelled "Check in Ben Tan"), A on the
  focused row, and ⋯ › Check in. Choosing rows (the box, Shift for a range, or
  the header box for all) opens the floating bar with Check in. Only booked
  spots have a box: a held spot waits for payment, and a member already here or
  cancelled has nothing to do (`unselectable`). Rails has no bulk call, so the
  bar sends Rails' single attend call once per chosen row, one after another.
  Rails ignores a booking that is already checked in and keeps its time, so a
  second tab, a retry, or a stale page is safe. The toast says "3 members
  checked in", or "2 of 3 checked in" with the names that failed and Try again,
  and the failed rows stay chosen. Checking in needs bookings:manage.
- Rows: right-click or ⋯ opens Check in, Open member, Open sale, and Cancel
  booking…. The panel has Program (a link), Host (text), Location (with several
  locations), Time, and Status (the schedule's mark and words).
- Not shown, because Rails has no data for them (issue #20): No-show and its
  undo, arrival times before check-in, a bulk check-in call, the sale's payment
  state on a booking (a held spot says "Awaiting payment"; a sale that is not
  fully paid does not), guest-of names beyond the holder, staff hosts, session
  notes, and activity and comments.
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

Programs, Program details, and New program (issue #92, Paper "Program",
light and dark) are on the shared parts (`features/programs/ProgramsList.tsx`,
`ProgramDetails.tsx`, `SessionsChart.tsx`, `ProgramForm.tsx`, and
`ProgramDialogs.tsx`; facts in `facts.ts`, the sessions, the chart, and the fill
rate in `sessions.ts`, kind tiles in `kinds.tsx`, publishing in `publish.ts`,
styles in `styles/programs.css`). They show only Rails data. Paper could not be
read while they were built (the Paper server timed out), so the layout, order,
and content follow the saved light screenshots of "Program" and "Session · A3",
and every size and colour comes from the tokens and shared parts built from
Paper in #85 and #87. Where a size had to be judged, it is the nearest token:
the chart column is the 8px `SpotColumn` step, the chart plot is 14px per day,
and the ribbon's rows are 34px apart.

- Programs (the Members list pattern): the title with the program count on
  the right, New program (N, programs:manage) in the top bar, a filter bar (Filter
  with Kind and Visibility, with counts and "is" and "is not" chips; search over
  names and hosts, "/" hint; Display), the list table, and a page range. Rows
  are 56px: the kind tile (the set's groupClass, event, and appointment icons),
  the name with Staff only, then kind, length, and the location when there are
  several; the host with an initial; and the upcoming count. Program, Host, and
  Upcoming sort from the header. Display has Sort by (Program, Host, Upcoming)
  and the chips Host and Upcoming, with Reset to default. Rails returns every
  program; the list sorts by name, filters, and pages 50 at a time in the
  browser. The URL keeps `kind`, `visibility`, their `_not` flags, and `q`.
  Orbit dots sit behind the title. Phones drop the header band and put the host
  on line 2.
- No programs: one line ("A manager adds programs." without manage). No
  match: one line, Clear search or Clear filters. Did not load: one line, the
  reason, Try again. Loading keeps the toolbar and the label row.
- Program details: `DetailLayout` with the orbit dots. The hero is the name at
  display size with one stat, the fill rate for the last four weeks. Rails has
  no fill rate, so the page derives it exactly: spots taken over spots offered,
  for the sessions that ended in the last 28 days and were not cancelled. Rails
  counts a spot as taken while its booking is confirmed, attended, or held. It
  needs the schedule from the last two months, which the route loads next to
  the program (`listSchedule`); if that did not load, or no session qualifies,
  the stat is left out. Book member (B, primary), Sell ticket (S, when a ticket
  is on sale and the role can sell), and ⋯ (Publish or Make staff only ⇧P, Edit
  program, with programs:manage) are in the top bar. Add sessions (T) is in the
  Sessions header and Add ticket in the Ways to book header.
- The chart ("Last week and the next 30 days"): one spot stack per session on
  a line of days, with the key (Booked, Open, Full), a Today pin, a red cross
  and "Cancelled" under the first cancelled session, a label every Monday, and
  "Last session" with its date at the right. Past sessions are grey. A stack
  draws at most 16 spots; a larger session is drawn smaller and never shows
  full unless it is. A click on a column opens that session. The chart repeats
  what Sessions says, so assistive technology skips it. On a phone the plot
  scrolls sideways at 14px a day.
- Sessions: the next four sessions from today as one-line rows: the day, the
  time ("Today" beside it), the row-size spot stack, and "9 of 12", "Full" in
  amber, or "Cancelled" with the reason (a cancelled session draws a flat
  line). Past and cancelled rows are grey. "Show all sessions" opens the rest
  in place as Upcoming and Past groups, each by week; when the schedule did not
  load, only Upcoming shows and a line says so. Each row opens the session.
- Ways to book: a table of Name, Type (Membership, Pass, Ticket), and Price
  ("Included", "1 credit", or the ticket's amount), from `accepted_by` and the
  tickets. A ticket that is off sale or archived says so, and its ⋯ has Put on
  sale or Take off sale, and Archive price… (the shared confirm). Prices sort
  by name, so a change of state does not move a row.
- The panel: Kind, Host (text), Length, Capacity, Visibility, Location (several
  locations), and the Note, which is Rails' description as plain text (it has no
  author or date). Phones put the panel under the page.
- Sell ticket and Book member reuse `BookMemberDialog` from the schedule with
  a Session picker (`sessions`); Sell ticket (`mode="sell"`) offers tickets
  only. A ticket buys spots in one session.
- Add sessions and New ticket use the sale dialog frame: labels above 32px
  fields, ⌘↵, and `FormNotice` when Rails does not answer. Add sessions sends
  Rails' first date, start time, and 1 to 26 weeks; the summary says
  "4 sessions · Tuesdays, 07:00 · 17 Nov to 8 Dec · 12 spots each".
- New program: a page on the same record frame as the program page (orbit
  dots, `DetailHero` with the kind tile and "New program", and `Section`s):
  Details (Name, Kind cards, Host, Length, Spots per session) and Schedule
  (Starts at, From, Repeat weekly for, or "No sessions yet") on the left;
  Location, Visibility, and Note in the right panel from 1100px. Narrower
  screens put the panel after the title, in the page itself (`useWide`), so Tab
  follows the screen.
  Create program (⌘↵) creates the program with an Idempotency-Key, then adds
  the sessions. The created toast offers Publish; the published toast offers
  View on site when the gym site is public. Leaving with changes asks
  "Discard this program?". Phones put the create bar at the bottom, with no
  tab bar.
- Edit program (`/programs/:id/edit`): the same page with Save changes, no
  Kind and no Schedule.
- Not shown, because Rails has no data for them (issue #20, and #21 for
  tickets): the weekly pattern line ("Mondays and Wednesdays at 07:00", Rails
  keeps no recurrence rule), bookings per way to book and the mix bar over
  them, staff hosts and a host picker, the program note's author and date,
  program activity and comments, Duplicate and Archive program, pass credits per
  program, ticket Covers, Who can buy, and Sell online, several days per
  schedule, Until, and specific dates.

The Products list, Product details, and New and Edit product (issue #93, Paper
"Product" and "Product · Pass (10-class pass)", light and dark) are on the
shared parts (`features/products/ProductsList.tsx`, `ProductDetails.tsx`,
`PriceDialogs.tsx`, and `ProductForm.tsx`; rules in `facts.ts`, loading in
`load.ts`, styles in `styles/products.css`). They show only Rails data. Paper
could not be read while they were built (the Paper server timed out on every
call), so the layout, order, and content follow the issue text and the Member
and Sale pages, and every size and colour comes from the tokens and shared
parts built from Paper in #85 and #87. The Products list and the two forms have
no Paper frame; they use the same parts.

- A product has many prices, as in Paper. Rails never changes a price a sale may use, so a new amount or
  length is a new price. Staff add it from the product page, then take the old
  one off sale or archive it. Edit product has no price fields.
- Products: the title with the product count on the right, New product (N,
  products:create) in the top bar, the filter bar (Type and Status with counts,
  chips with "is" and "is not", search over names, and Display), the list table,
  and a page range. Columns: product (kind tile, name, and its terms such as
  "10 bookings · 60 days"), Type, Status (On sale, Staff only, Not sold, each
  with a dot), and Price. Display sorts by Status, Name, or Price and hides
  Type. Not sold rows are grey and sort last. Tickets are left out; they live on
  the program page. The URL keeps `type`, `status`, their `_not` flags, and `q`.
  Narrow tables put the price on line 1 and the type and status under it.
- Product details: `DetailLayout` with the barcode pattern. The hero has the
  kind's tile, the name, a status tag (On sale, Staff only, or Not sold), and the
  note as one muted line. Sell (S, purchases:create, a price on sale) opens New
  sale with the first price on sale chosen; Edit (E) and the more menu (Publish
  on the gym site or Make staff only) need products:update.
  - Prices: a table of Name, Length, Status (On sale, Not on sale, Archived),
    and Price, with Add price in the header. The row menu has Sell at this price
    (purchases:create, price on sale), Take off sale or Put on sale, and Archive
    price… (a confirm dialog that says members keep what they bought; products:update).
    Archived rows are grey and have no menu: an archived price never goes back on
    sale. Add price opens a dialog (Price, Length or Valid for in days from
    fulfillment, and an optional Name; the name defaults to the length) and the
    price is on sale at once.
  - Benefits: a table of the benefit (tile, name, and the programs it books),
    Amount (the allowance bar and the words, such as "10 bookings" or
    "Unlimited visits"), and Location. "Changes apply to new sales." sits under
    it. Edit benefits opens Edit product (products:update).
  - Panel: Kind and Visibility (Gym site and desk, or Staff only).
- New product and Edit product: `DetailLayout` with the barcode pattern and the
  record frame, as New member. Details (Name, and Type cards on a new product),
  Price (Price and Length or Valid for, new products only), and Benefits (Name,
  Gives, visits or bookings, Location, Programs). Where the product is sold (Gym
  site) and the Note are in the right panel. ⌘↵ saves; leaving with changes asks
  first. A new product needs products:create and products:update, because adding
  its price needs update. If the price fails after the product exists, an error
  toast says so and the product page opens, so staff never create it twice; Add
  price sets it.
- The note is the hero's muted line and is not repeated in the panel. Rails has
  no note author or date.
- Not shown, because Rails has no data for them (all in
  [#21](https://github.com/kennedywee/flowfokus/issues/21)): the active member
  or pass count, Revenue, Sales, and Average stats, the active count and archive
  date of each price, credits left on active passes, "Ending in 7 days", product
  activity and comments, who can buy and member tags, a desk or online channel
  beyond the gym site, product-level locations, "valid from first use", and
  archive and restore of a whole product.

Settings is a dialog over the page staff are on (issue #94; `features/settings/`:
the dialog in `SettingsDialog.tsx`, the page parts in `SettingsPage.tsx`, the
pages `Appearance.tsx`, `General.tsx`, `GymSite.tsx`, `Locations.tsx`,
`Labs.tsx`, `Staff.tsx`, `Roles.tsx`, and `Features.tsx`; the page list in `sections.ts`; rules in
`facts.ts`, `team.ts`, and `abilities.ts`; styles in `styles/settings.css`).
It was built from the issue and the recorded Settings rules while Paper was
unreachable; [#113](https://github.com/kennedywee/flowfokus/issues/113)
compares it with the Paper page "Settings". It shows only Rails data:

- The dialog: 1120 by 800 pixels at most, a 240px side in the sidebar colour,
  and a close button at the top right. The side has "Settings", a search that
  keeps the pages whose name or other words match (Enter opens the first), and
  the pages in groups with icons: You (Appearance), Gym (General, Gym site,
  Locations, Labs), Team (Staff, Roles), and Developer (Features). Gym site
  shows only when the `gym_site` feature is in effect, Labs only when a feature
  is in Labs, and Developer only for staff with `features:manage`
  (`settingsPagesFor`). The address of a page the person does not have opens
  General. Profile, Notifications, Payments, and
  Booking rules have no item until Rails supplies them. The open page shows in
  a 720px column.
- Address: the page is a search value on any organization address,
  `?settings=staff`. A link opens the dialog on that page. Close, Escape, and
  Back return to the page behind it; moving between settings pages replaces
  the history entry. `/<org>/settings/<page>` and old `?section=` links open
  the dialog over the first page the role can read. A role that can read no
  page has an empty page behind it, so closing opens General again. The
  account menu, ⌘, (or Ctrl ,), Ctrl K, Manage locations, and a program's Add
  a location open it. A form's unsaved-changes guard lets Settings open over
  it (`onlySettingsChanged`).
- ui-sdk traps focus and closes on Escape. Focus starts on the dialog, so Tab
  reaches the search first. A dialog or menu inside it (New location, Invite
  staff, a staff row's ⋯) closes first on Escape. Toasts show above it.
- Page: the title is 30px / 36px, weight 500, -0.035em on every page. A page
  action sits beside it as a 32px secondary button with a plus (New location,
  Invite staff). Sections have a 15px header with the only hairline, 12px
  under the text. A row is a title, one line of description, and one control:
  a value, a select, or a switch. No lines between rows.
- A change saves when it is made: the time zone, the gym site's Public switch,
  and the theme. The control shows the new value at once and a toast confirms
  it; a refusal puts the old value back with an error toast. There is no save
  bar.
- Appearance: Theme, System, Light, or Dark, the same choice as the account
  menu (`lib/use-theme-choice.ts`). Every role can change it.
- General: the name and currency as values, and the time zone. Gym site: the
  address (`<slug>.flowfokus.com`) and the Public switch. Roles without
  settings:manage see the values and the lock line.
- Labs (issue #98): one row per feature in Labs, with a Beta tag beside the
  title, its description, and a switch that saves at once. Roles without
  settings:manage see the switches off limits and the lock line.
- Developer, Features (issue #98): an Organization section with the WorkOS
  organization ID in Geist Mono, and a Features section with one row per
  feature and an Off, Labs, On segmented control that saves when chosen. Built
  from the issue while Paper was unreachable; the Paper frame's text about the
  role seeing no member or payment data is out of date.
- Locations: pin, name, address, and a chevron, with no section header. A
  row opens the edit dialog. A taken name reads "Another location is already
  called Bangsar". No remove: Rails keeps every location.
- Staff: no section header; Invite staff beside the title; a table with Name,
  Role, and Status and a hairline under the headings, 20px under the title.
  Rows show name and email, role, and status ("Active", or a coloured icon
  with grey text for "Not synced yet" and "Inactive"). Invitations show
  "Invite expires …" in warning colour and "Not joined". A pending member with
  an invitation for the same email shows once, as the invitation. The ⋯ menu
  holds Role (only roles the viewer may grant) and Remove access…; an
  invitation's ⋯ holds Revoke invitation. Rails' `manageable` decides the ⋯.
  The dialog loads the list when Staff or Roles opens and again after each
  change. A refusal never shows Rails' text, which can name permission codes:
  `team.ts` maps it to a staff sentence and reloads the list when it is out
  of date.
- Roles: a table of what each role can do, from the WorkOS roles in
  `/staff/team`; `abilities.ts` only names groups of permissions. It needs
  staff:manage, like Staff. There is no New role: WorkOS holds the roles and
  Rails has no endpoint to add one.
- Phones (until #95): the dialog fills the screen, and the pages scroll in one
  row under the title, without the search. A select takes the full width.
- Not shown, because Rails has no data for them: logo, editable name,
  contact email, week start, member ID prefix, location hours and counts,
  removing a location, staff last active and locations, the day an invite was
  sent, resend invitation, role descriptions, New role, and the Profile,
  Notifications, Payments, and Booking rules pages.

The sign-in screens:

- Sign-in card (`components/Blocked.tsx`): the mark, a 16px title, one
  message (a red or amber icon for errors and warnings), one dark 36px
  button, and the account line with an underlined Sign out (still a POST
  form). The portal start sends staff to the WorkOS sign-in page; there is no
  password form in the portal. Staff access is turned off shows one plain
  message for every reason. `__root.tsx` has Page not found and the app error
  screen ("Something went wrong", Reload).

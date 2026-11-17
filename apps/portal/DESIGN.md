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

Use Geist Variable for interface text and Geist Mono Variable for money, times,
counts, and IDs. Use the existing `--text-*`, `--font-weight-*`, and `--leading-*`
scales. Body text uses `--text-base` (14px); page titles use `--text-xl` (24px).
Do not use mono as decoration. Use `Money` and `Time` for domain values.

## Layout

Use `PageHead`, `.stack`, and the existing `.grid-2` variants. `PageHead` has
a title, optional factual `meta`, and actions; it has no instructional subtitle. Keep the page
heading and its main action together. Use one primary action per decision group;
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

Good: `SalesTable` uses `saleState(sale)` and `saleStateLabel(sale)` from
`src/lib/format.ts`. This distinguishes paid, delivered, void and revoked states.
Bad: setting `state="delivered"` because the user clicked Deliver before Rails
returns success. Payment and fulfillment are separate facts.

Good: `SubmitButton pending={action.pending} pendingLabel="Saving…"` keeps a
clear label and prevents repeat submission. Bad: a hand-styled `<div onClick>`
with no disabled, focus, or pending behavior.

Existing blocks to compose before adding another abstraction:

- `PageHead`: title, optional record metadata, and actions.
- `Plate`: named section with body and optional action/footer.
- `SalesTable`: organization links, current sale state, money, mobile summary.
- `CheckInPanel`: member/location choice and a response after an attempt.
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
- Keep status words tied to Rails facts. Paid does not mean delivered.
- Keep focus visible, icon-only controls named, and fields labelled.
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
  extends 12px past the content on each side, so its title lines up with the
  rows. The activity feed header has no band, because the comment box below it
  already marks the start.
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
secondary text. The base `h1` is now 20px. Geist stays the interface font;
Paper shows Figtree. Changing the font needs a new font package and is a
separate decision.

Controls. `Button size="compact"` (and `"icon-compact"`) is the 28px redesign
button with an 8px radius (`--control-height-compact`, `--radius-compact`). A
compact secondary button has a hairline and a 1px drop (`--shadow-control`).
Coarse pointers grow it to 40px. `Kbd` shows a key hint inside a button; put
`aria-keyshortcuts` on the button. Touch screens hide the hints. Show a hint
only where the shortcut works (`lib/shortcuts.ts`).

Shell. The sidebar (236px, no fill or edge) holds the logo, the collapse
button, one list of pages, and the account menu at the foot. The account menu
holds Settings, Theme, What's new, and Sign out. The 48px top bar holds the
breadcrumb: organization, location, section, and page. A detail route names
its page with `staticData.crumb(loaderData)`. The top bar has no search field:
a compact Search button and ⌘K (Ctrl K elsewhere) open `CommandMenu`, which
finds members through Rails and opens pages. The rail is 56px wide; icons stay
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
- Sale rows keep payment (Paid, Part paid, Unpaid, Void) and delivery
  (Delivered, Not delivered, Access revoked) as separate facts, then the
  payment method and the amount, with any balance due under it.
- Activity merges check-ins, sales, payments, deliveries, refunds, voids,
  bookings, and the join date. It has no comment box or filters, because
  Rails has no member comments.
- Properties: email, gym site sign-in (click the value to create a link code
  or unlink, with members:link), member since, and total paid.

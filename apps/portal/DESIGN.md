---
name: Flowfokus staff portal
description: Quiet operational UI with neutral surfaces and explicit state.
---

## Overview

Mode: Operate. Staff serve a customer at the desk. Keep actions and facts easy
to scan. Preserve the existing Paper-derived identity: black surfaces in dark
mode, warm pale surfaces in light mode, hairline borders, and restrained color.
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

Use `PageHead`, `.stack`, and the existing `.grid-2` variants. Keep the page
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

- `PageHead`: title, supporting text, and actions.
- `Plate`: named section with body and optional action/footer.
- `SalesTable`: organization links, current sale state, money, mobile summary.
- `CheckInPanel`: member/location choice and granted or denied response.
- `ConfirmDialog`: one consequential decision with pending handling.
- `Field` plus `FailureNotice`: field errors and request failure at separate levels.

See the component source for exact props. Only document or use built variants.
A data block's parent owns loading, empty and failure branches; presentational
pieces do not each need their own request.

## Do's and Don'ts

- Use semantic tokens in screens. Change raw swatches only in the palette.
- Reuse existing components before adding another variant.
- Keep status words tied to Rails facts. Paid does not mean delivered.
- Keep focus visible, icon-only controls named, and fields labelled.
- Preserve both themes and reduced motion when changing styles.
- Treat preview data as preview data. Do not imply it came from the API.

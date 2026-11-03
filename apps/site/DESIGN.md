---
name: Flowfokus gym site
description: Light aluminum surfaces with graphite offer boards and clear access states.
---

## Overview

The gym site serves public visitors and signed-in members. Preserve the existing
light aluminum appearance. The gym name and offers come from Rails. The staff
portal has its own visual system. Read [the system guide](../../docs/design-system.md).

## Colors

Raw OKLCH values live in `src/styles/primitives.css`. Semantic roles live in
`src/styles/tokens.css`; `src/styles.css` consumes them. Swatch names encode
the color coordinates and have no UI meaning.

Use `--ground`, `--plate`, and `--plate-sunk` for surfaces; `--ink`, `--ink-2`,
and `--ink-3` for text; `--edge` and `--edge-strong` for boundaries. Use
`--action`, `--action-hover`, and `--action-ink` for actions. `--focus` marks
keyboard focus. Keep graphite offer sections on `--board*` roles.

`--granted*`, `--denied*`, and `--due*` describe outcomes and attention. Pair a
lamp with visible status text. An offer benefit lamp describes an included
benefit; it does not prove that the visitor currently holds that entitlement.

## Typography

Use Barlow Semi Condensed for headings (`--font-legend`), the system sans stack
for body text (`--font-body`), and mono for data (`--font-data`). Body uses
`--step-0` (0.9375rem). Use the existing `--step-*` scale and fluid heading rules.
Keep prices and fixed terms legible together.

## Layout

`.wrap` centers content with a maximum width of 68rem. `.opening`, `.board`,
`.locations`, and `.account` are existing page sections. The offer grid becomes
one column at 720px. Keep actions wrapping and member forms within the account
width. Use this app's `--space-*` scale; it differs from the portal scale.

## Elevation & Depth

Plates have thin edges and an inset highlight. Keep the price board dark and
flat. Use `--duration-hover` and `--duration-press` for button feedback.
Preserve the reduced-motion override.

## Shapes

Use `--radius` for plates and `--radius-control` for actions and inputs.
Lamps stay small and round. Do not apply the portal's radius system here.

## Components

This app uses CSS compositions in route components. It does not use the
portal's shadcn library. Keep that boundary until both apps need the same code.

| Need | Existing pattern | States |
| --- | --- | --- |
| Action | `.button`, `.button--quiet`, `.button--large` | Hover, press, focus, disabled and `aria-busy` are styled. The caller owns pending text. |
| Outcome | `.status` plus labelled `.lamp` | Set `data-state` from the real result. Never rely on color alone. |
| Feedback | `.notice` with title/body | Use error, warning or success tone with the response and recovery step. |
| No records | `.empty` with `.empty__title` | Distinguish no offers from a failed gym load. |
| Offer | `Offer` in `src/routes/index.tsx` | Lists API benefits, immutable prices, currency, and terms; parent owns empty offers. |
| Member account | `src/routes/account.tsx` | Handles sign-in/linking and account results. Preserve server ownership of access rules. |
| Host/load failure | `HostMessage` in `src/routes/__root.tsx` | Keeps unknown hosts and unavailable gym data distinct. |

Good: the home page reads `organization.online_payments` to select payment
copy. Bad: hard-coding “Pay online” for every gym regardless of configuration.
Good: use `formatMoney` and the returned currency. Bad: divide every amount by
100 and prepend a fixed currency symbol.

## Do's and Don'ts

- Use semantic roles in screen CSS. Keep raw colors in the primitive file.
- Keep gym names, availability, prices and access facts tied to Rails responses.
- Preserve loading, empty, failure and pending states at the request owner.
- Keep form labels, visible focus, keyboard navigation, and reduced motion.
- Keep the public site and staff portal visually distinct.

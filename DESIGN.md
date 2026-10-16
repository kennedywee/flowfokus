# Design

The visual system for the Hydraflow staff portal (`apps/portal`) and gym site (`apps/site`). Product truth lives in [PRODUCT.md](PRODUCT.md).

## World

An access-control panel at a gym front desk. Aluminum ground, white instrument plates with a 1px machined edge, graphite legends, and lamps that light only to report state. The portal is a tool (Operate). The gym site uses the same world and hangs its offers on a graphite price board.

Scene: bright overhead gym light, staff on a laptop or tablet while a member waits. The theme is light.

## Color

Restrained. Neutrals carry the surface. Color appears only as state or as the primary action. All values are OKLCH and live in each app's `src/styles.css` `:root`.

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `oklch(0.948 0.005 240)` | Page ground (aluminum) |
| `--rail` | `oklch(0.918 0.007 240)` | Portal side rail, segmented controls |
| `--plate` | `oklch(0.995 0.002 240)` | Panels, inputs |
| `--plate-sunk` | `oklch(0.972 0.004 240)` | Inset areas, hover |
| `--edge` / `--edge-strong` | `oklch(0.85 …)` / `oklch(0.74 …)` | Plate edges / control borders |
| `--ink` / `--ink-2` / `--ink-3` | `oklch(0.23 / 0.40 / 0.50 …)` | Text: primary / secondary / muted (all ≥ 4.5:1 on plate) |
| `--action` | `oklch(0.44 0.095 245)` | Primary buttons, links, selected choice |
| `--focus` | `oklch(0.56 0.16 245)` | Focus ring |
| `--granted` | `oklch(0.6 0.15 150)` | Lamp: granted, paid, delivered, active |
| `--denied` | `oklch(0.58 0.2 27)` | Lamp: denied, error |
| `--due` | `oklch(0.76 0.15 75)` | Lamp: balance due, waiting for delivery |
| `--lamp-off` | `oklch(0.82 0.006 240)` | Lamp: no state |

Each state color has `-ink` (text) and `-wash` (background) partners. Gym site board: `--board` `oklch(0.25 0.014 250)` with `--board-ink` text.

## Type

| Role | Face |
| --- | --- |
| Headings | Barlow Semi Condensed 600, self-hosted via `@fontsource/barlow-semi-condensed`. Stamped panel legends. |
| Body and controls | System UI sans stack |
| Money, amounts | System monospace, tabular |

The portal uses a fixed rem scale (`--step--1` 0.8125rem to `--step-4` 1.875rem). The gym site's opening and board headings scale with `clamp()`. Tabular numerals are on everywhere.

## Components

- **Plate**: white panel, 1px edge, 10px radius, inset top highlight. No drop shadows. Never nested.
- **Lamp**: 10px dot. Off is gray; a lit lamp gains a soft ring in its color. It is always paired with a text label. Color is never the only signal.
- **Result plate**: the check-in answer. A large lamp powers on (420ms) and the plate takes the state's wash. A denial always names its reason and the next step.
- **Buttons**: one filled primary (`--action`), one quiet outline. 40px minimum height (48px large). The pending state shows a spinner and a verb ("Recording…").
- **Choice**: radio rows for offers and payment method. The checked row gets the action border.
- **Fields**: label above, hint and inline error below, linked with `aria-describedby`.
- **Notice**: lamp + title + body, toned info / warning / error / success.
- **Demo tag**: dashed amber label "Local demo" on every demo page.

## Motion

150–250ms ease-out on state changes. One authored moment: the check-in lamp turning on. `prefers-reduced-motion` removes motion.

## Layout

- Portal: 15rem side rail plus content up to 72rem. Below 860px the rail becomes a sticky top bar with a scrollable nav, and tables stack into label/value rows.
- Gym site: centered 68rem column; opening, price board, locations, footer.

# Design system

Flowfokus uses five layers so people and agents can build consistent screens.
This applies [Rico's design-system article](https://x.com/_heyrico/status/2116953958279479760)
to the existing app. The article was read through the
[public mirror](https://api.fxtwitter.com/status/2116953958279479760).
It proposes recording visual decisions in tokens, components, blocks, rules,
and task-specific skills. This repository implements those layers as follows.

| Layer | Portal | Gym site |
| --- | --- | --- |
| Primitives: raw palette | `apps/portal/src/styles/primitives.css` | `apps/site/src/styles/primitives.css` |
| Foundations: semantic color roles and type, space, radius, motion scales | `apps/portal/src/styles/tokens.css` | `apps/site/src/styles/tokens.css` |
| Components: small reusable pieces, and the one icon set (`components/ui/icon.tsx`) | `apps/portal/src/components/ui/` and `components/ui.tsx` | CSS patterns in `apps/site/src/styles.css` |
| Blocks: composed sections | `PageHead`, `Plate`, `PaymentMark`/`FulfillmentMark`, `ListToolbar`, `ListPager`, `useCheckIn`, `ConfirmDialog` | Opening, offer board, locations, member account |
| Rules and review skill | Root `AGENTS.md`, app `DESIGN.md`, `.agents/skills/flowfokus-review-screen/SKILL.md` | Same entry points, with the site design file |

## Reference

The portal follows the Paper file
[Flowfokus Design](https://app.paper.design/file/01M7X4HENFQVWCFYKJH6A9QSXD/p-1-0).
It sets the portal's colours (zinc, in light and dark), type (Geist and Geist
Mono), radius (6, 8, 10, 12), and icons (one set, page "Icons"). Its tokens hold
the dark values; the light values come from its light frames. The portal's
values and the few places where they differ from Paper are in
[portal design](../apps/portal/DESIGN.md#colors). The gym site keeps its own
look. The earlier file "Flowfokus Redesign" is history.

Read [portal design](../apps/portal/DESIGN.md) or
[gym site design](../apps/site/DESIGN.md) before UI work. Each file lists actual
components, defaults, states, and good/bad uses. Source CSS and component APIs
remain the authority for exact values and props. Do not copy token values into
another theme configuration.

## Component gallery

The portal shows every built component and block at
`localhost:4001/components`, for example `localhost:4001/components/button`.
Each page has live examples with their code, states, the props that matter,
and links to the Paper board and the source. Check it before you build a
component. It runs in local development only; a production build answers
Not Found. It needs no sign-in, and its examples use sample data.

The entries live in `apps/portal/src/features/components/registry.ts`. Each
example is one file in `features/components/examples/`; the page renders it
and shows its source, so the two cannot drift. To add a component, add its
entry and at least one example. `registry.test.ts` fails when a file in
`components/ui/` has no page. The gallery lists only code that exists: a
design without code stays in Paper.

## Simplicity standard

Each screen has one task. Layout, field labels, and action names carry that task.
Do not add a tagline, instructional subtitle, or routine helper paragraph.
Fix grouping, order, or the control when a screen needs an explanation.

Keep record facts and decision requirements: prices, terms, dates, locations,
identity, permission limits, error recovery, and the consequences of payments,
early access, refunds, and overrides. These are data and action feedback.
Do not hide them to make a screen appear simpler.

Use `PageHead` for a title and actions. Actions show in the top bar after
Search, as in the Paper redesign; on phones they stay in the page. Its optional `meta` slot holds record
metadata, such as a sale date or program location. It has no description prop.
Show dependent controls when their prerequisite is chosen. Keep labels and
validation attached to the controls. Show check-in feedback after an attempt;
do not fill the idle form with a description of where the result will appear.

Prefer one implementation with one owner. Real views live in `features/check-ins` (the check-in flow), `features/schedule`, `features/programs`, `features/products`,
and `features/settings`. `features/preview` owns simulated
features only. `components/Filters.tsx` owns selection filters. Keep fetching and mutations at their current request boundaries.
Feature layout styles live in `styles/features.css`. No new service layer, UI
framework, or dependency is needed. Do not show no-op controls or advertise
keyboard shortcuts that are not implemented.

A change should reduce effort for the user, the developer, and the next agent.
Use concrete tests for behavior, and keep type checks and live workflow checks.
Do not promise perfection from a build or a visual inspection alone.

## Proposed visual directions

The current app design files describe the implementation, not a final visual
choice. The [component lab](explorations/check-in/PLAN.md) explores three new
directions with Stageshow. Open `explorations/check-in/index.html` to compare
components and simulated check-in states. No direction has been selected or
applied to production screens.

## How to change a screen

1. Start with the app's existing blocks. Add a block only after repeated screens
   show the same need. Do not build a catalog of speculative components.
2. Choose semantic roles for the job. A muted label uses a text role; an error
   uses an error role. Neither chooses a swatch directly.
3. Use existing type, spacing, radius and motion tokens. One-off geometry and
   responsive constraints can stay local. Do not make a token for every pixel.
4. Keep state handling with the owner of the request. Show loading, empty,
   failure and pending states where they apply. Keep the last confirmed facts
   distinct from the operation in progress.
5. Review with the project skill. Run the checks below. Record any UI checks
   that could not be performed.

## Change the system deliberately

The apps have distinct visual identities and spacing scales. Each app imports
its palette before semantic tokens, then its screen CSS. Portal CSS retains its
Tailwind layers and the theme variable bridge. Theme choice stays in the portal's current
server/cookie mechanism. The site stays light. No new shared package is needed.

A new color starts in primitives and gets a semantic role before screen use.
Alpha colors in existing portal elevation tokens remain local to those tokens.
A new component variant must exist in code before design guidance lists it.
Update the owning app's design file with the reason and applicable states.

If a request leaves a new brand direction or business meaning unresolved, flag
that choice. Routine layout choices within these scales need no new approval.
Do not infer product capabilities from the older `PRODUCT.md`; current code,
contract, and domain documents establish functionality.

## Checks and limits

`bun run design:check` rejects literal hex and functional colors in screen CSS,
and direct raw swatch references outside the palette/foundation files. It runs
in `scripts/check`. Tooling tests cover its acceptance and rejection cases.
It permits `color-mix()` with semantic roles and `transparent`/`currentColor`.

This is a narrow guard. It does not validate contrast, named CSS colors,
Tailwind arbitrary values, JSX inline styles, SVG assets, or business-state
accuracy. Those remain review tasks. It does not promise pixel-perfect parity.

Run `bun run typecheck`, `bun run test:web`, and `bun run build` after changes
that affect both apps. No API shape or business rules changed in this extraction,
so OpenAPI types need no regeneration.

## Extraction verification — 3 November 2026

- All pre-existing semantic token values matched after resolving the new swatches.
- `design:check`, type checks, web tests, tooling tests, and both app builds passed.
- The project skill passed `quick_validate.py` from skill-creator.
- Worker artifact checks passed. Builds reported a non-blocking CSS source-map warning.
- Browser appearance, keyboard operation, and contrast were not rechecked.
- Rails and API behavior did not change. Backend tests were not rerun.
- Nothing was pushed, published, or deployed.

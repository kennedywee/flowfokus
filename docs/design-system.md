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
| Components: small reusable pieces | `apps/portal/src/components/ui/` and `components/ui.tsx` | CSS patterns in `apps/site/src/styles.css` |
| Blocks: composed sections | `PageHead`, `Plate`, `SalesTable`, `CheckInPanel`, `ConfirmDialog` | Opening, offer board, locations, member account |
| Rules and review skill | Root `AGENTS.md`, app `DESIGN.md`, `.agents/skills/flowfokus-review-screen/SKILL.md` | Same entry points, with the site design file |

Read [portal design](../apps/portal/DESIGN.md) or
[gym site design](../apps/site/DESIGN.md) before UI work. Each file lists actual
components, defaults, states, and good/bad uses. Source CSS and component APIs
remain the authority for exact values and props. Do not copy token values into
another theme configuration.

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
Tailwind layers and the shadcn bridge. Theme choice stays in the portal's current
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

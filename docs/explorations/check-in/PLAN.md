# Component exploration

Status: proposed. These concepts replace visual choices only inside the lab.
The current app DESIGN.md files describe the incumbent implementation; they do
not constrain this user-requested exploration.

Medium: interactive React specimen, with an optional once-only cursor demo.
Place: a standalone review page, 688px wide; compact composition at 358px.
Focus: find a member, select them, record check-in, read the confirmed result.
Payoff: granted access remains visible. Denied access keeps a reason and next step.
Data: fictional examples, clearly labelled. No API calls or persisted writes.

Directions: Grove (warm, rounded, forest), Studio (cool, compact, cobalt),
Night desk (navy, high contrast, amber). Each changes grouping and density as well
as color. Shared components: search field, Row, Avatar, status, primary/secondary
button, result, notice. Keep one workflow so comparisons remain fair.

Gold: start from static-card's cropped window/list composition and form-error's
reserved message lane, fixed action footprint and once-only payoff. Preserve
kit Stage, Window, Row, Avatar, States, Check and scripted measured targets.
Remove the satellite; a second panel gives check-in its real context. Real words
replace filler because the user is reviewing components, not a marketing crop.
Keep the action and result whole; only the continuation of the window may crop.

Beats: focus search → type Ada → choose Ada → check → pending → granted.
Use real buttons for manual scenarios and no live service. Show reduced-motion
poster as granted. A replay is an explicit reset, not a silent data rewind.

Deliver source and one self-contained HTML artifact. Build without a dev server.
Film file URLs with the skill scripts; inspect desktop, compact and changed states.

## Local use

Open `index.html` directly in a browser. It bundles React, the Stageshow parts,
icons, styles, and the local Geist font. It makes no network requests.

To rebuild from the repository root after `bun install`:

```sh
node docs/explorations/check-in/build.mjs
```

To run the exploration checks and Stageshow recording tools, install the skill's
own tooling with `npm ci --prefix .agents/skills/stageshow --ignore-scripts`.
This does not change the app dependencies. Then:

```sh
node_modules/.bin/tsc -p docs/explorations/check-in/tsconfig.json
CHROME_PATH=/usr/bin/chromium node docs/explorations/check-in/verify.mjs
```

Optional URL parameters: `?look=0`, `?look=1`, or `?look=2` select a concept;
add `&demo=1` for the scripted once-only demonstration. `?capture=gold` shows
the copied static-card reference for comparison.

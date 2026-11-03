# Rehearsal: Flowfokus component exploration

Status: review concepts, not production components or an approved redesign.

Gold: Stageshow `static-card`, copied into `gold.tsx`, filmed at 728px.
Kept the cropped window, named rows, avatar, measured targets, and the product's
working context. Replaced the invoice satellite with a member detail section.
Borrowed fixed message/action lanes and once-only payoff from `form-error`.
Unlike the gold's marketing crop, this is a component review with real labels
throughout. It gives the member and the recorded result the visual emphasis.

Beats: search, type Ada, select Ada, check in, pending, granted. The result holds.
Replay is explicit. There is no seamless loop or silent reset of a recorded fact.

Captured: three looks at 728px and 390px for interactive state checks. Full
sequences filmed for Grove desktop and Night desk compact. Final contact sheets
and JSON reports are in `rehearsal/`. Read both sheets against the skill's
`references/verify.md`. Reduced motion shows the granted poster and was tested.
No live records or authentication are involved.

## Findings and response

- Member selection arrow wrapped below its row. Assigned the real button to the
  Row's trailing grid cell. Action and identity now remain on one line.
- Next-member control cropped at the lower edge. Increased the desktop frame
  and made a separate stacked compact composition. Automated bounds checks pass.
- Dark headings inherited black. Set the scene foreground to its look token.
- Cursor script used incomplete target objects. Changed to named targets. Both
  tested viewport widths now reach granted without console errors.
- Search removed a row abruptly. Used the kit's Collapse around each retained
  row. Desktop motion report now has no jump or abrupt-exit finding.
- Result icon landed between pixels. Normalized message line heights and minimum
  result height. Desktop report no longer flags that glyph.

## Verification and limits

The exploration TypeScript check, standalone bundle build, design token check,
and `verify.mjs` passed. The interaction checks cover all three looks, ready,
granted, denied, error, no search results, simulated pending-to-granted,
compact/wide resize, horizontal overflow, action bounds, and reduced motion.
Tabs support arrow keys, Home and End. Broader screen-reader testing was not run.
App tests and backend tests were not rerun; app and API sources did not change.

The final desktop film clears Stageshow's never-intentional gate. Its complete
motion verdict is still inconclusive because headless sampling had gaps. The
changing result count is listed for manual inspection; the contact sheet shows
it tracking typed search text, not an unrelated state change.

The final compact film still flags uneven gutters on the page sections and
result notice, an 11px text-stack gap, and a half-pixel button glyph. The large
bottom distances include later components and off-stage continuation, so these
are not a claim that actions are cropped. The contact sheet and bounds checks
show the full action and result. Compact spacing and glyph alignment still need
a polish pass before implementation. Motion sampling also has gaps. This is not
a full animation-quality approval.

Visual self-review used the gold still, all three desktop/compact concept
captures, and the final two contact sheets. An independent reviewer was not used.
Fine press-by-press 40ms inspection, contrast measurement, and the remaining
mobile motion findings are unverified or unresolved. Keep those limits visible
when choosing a direction.

Assumptions: sample member names, ID fragments and membership terms are fictional.
A denied counted membership shows zero visits; the granted sample has unlimited
visits. The lab never claims that payment alone grants access.

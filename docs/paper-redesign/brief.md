# Paper redesign brief

This brief is for agents who design in the Paper file "Flowfokus Redesign"
(fileId `01M6FWEABX58V0RANJNQW72ZPN`). The goal: every screen and state of the
real staff portal has a design in Paper, in the redesign direction. The app is
built from Paper afterwards, so a missing state in Paper becomes a guess in code.

Read this file, then `apps/portal/DESIGN.md` ("Redesign direction" and
"Redesign foundation"), then your task.

## What you do

1. Read the real screen in code (`apps/portal/src`). List every screen, state,
   dialog, menu, field, action, and permission branch it has. Include loading,
   empty, error, validation, and no-permission states.
2. Read your Paper page(s). Use `get_tree_summary`, `get_screenshot`, and
   `get_jsx`. Map each item from step 1 to a Paper artboard.
3. Design what is missing, as new artboards on your page(s).
4. Review your work with screenshots. Fix what you find.
5. Write your report (see "Report").

Do not open browser preview tabs; the user is using the app. Read the code.
Do not change code, git, Docker, or design tokens. Do not commit.

## Paper rules

- Call `get_guide({topic:"paper-mcp-instructions"})` first. The design system
  is given here, so do not send a mood or palette brief. Do not invent a look.
- Always pass `fileId` and an explicit `pageId`. The user may be on another page.
- Work only on your assigned page(s). Other agents work on other pages at the
  same time.
- **Do not delete, move, rename, or restyle an existing artboard.** They are
  the user's approved reference. If an existing frame is wrong or stale, list
  it in your report under "Existing frames to update". Do not fix it.
- **Clone, do not redraw.** Start each new artboard from the closest existing
  artboard (`duplicate_nodes`, or `<x-paper-clone>`), so the window, sidebar,
  top bar, and spacing stay identical. Then change the content.
- Place new artboards in the free space to the right of or below the existing
  ones, 80px apart, on the same grid. Do not overlap anything.
- Name each artboard `<Screen> — <state>`, like the existing ones.
- Use the file's tokens as CSS variables (`var(--foreground)` and so on). Do
  not add raw hex colors. Do not create or change tokens.
- Font: Figtree only. Money, times, counts, and IDs use Figtree with
  `font-feature-settings: "tnum"`. No mono font.
- Write small pieces and take a screenshot after each section, as the guide says.
- If a Paper call times out, wait and try again. Do not use another tool instead.
- Call `finish_working_on_nodes` when you finish.

## Reference artboards

| Pattern | Page (pageId) | Artboard (nodeId) |
| --- | --- | --- |
| List with filter, search, pager | Sales (`p-E-0`) | `LYF-0`; filtering `U3Z-0`; no results `UQH-0` |
| List | Members (`p-8-0`) | `EVG-0` |
| Detail page with properties column | Member details (`p-6-0`) | `DNR-0` |
| Detail page with money rows | Sale details (`p-F-0`) | `NHI-0`; dialogs and menu `NY5-0` |
| Full-page form | New sale (`p-G-0`) | empty `OWZ-0`; filled `QDM-0`; error `TIQ-0` |
| Full-page form with fields | New member (`p-H-0`) | `VI1-0`, `V9D-0` |
| Dialog over a page | New sale (`p-G-0`) | add products `P6M-0`; record payment `Q71-0` |
| Confirm dialog | New sale (`p-G-0`) | `TP2-0` |
| Toast after an action | Sale details (`p-F-0`) | `TWC-0` |
| Settings | Settings & sign-in (`p-S-0`) | `17SU-0` |
| Phone | Narrow screens (`p-U-0`) | `197J-0`, `194Z-0` |

## The direction, in numbers

Read exact values with `get_jsx` and `get_computed_styles` on the references.
These are the ones that matter most:

- Artboard: 1440 wide. A rounded "Window" sits 24px inside the grey canvas.
  Sidebar 236px. Top bar 48px. Content padding 32px sides, 20px top, 24px
  bottom; 24px between sections. Properties column 300px, 16px side padding.
- Top bar, left to right: organization, location, section, page (breadcrumb);
  then on the right: Search (⌘K), the page's actions, then ⋯ when there are
  more. **Page actions always sit in the top bar.** 28px buttons, 8px gap. The
  primary action is a dark button (`--primary`); others are white with a
  hairline. Show a key hint only for a shortcut the app really has.
- Page head: a 40px tile (10px radius, muted fill, hairline) with an 18px
  icon, then the title: 20px/24px, weight 600, letter-spacing -0.01em.
- Text: three sizes only. 20px title. 13px/20px body and headings. 12px/16px
  secondary. Use weight and grey tone for hierarchy, not size.
- Section band: 36px high, 8px radius, `--muted` fill, a 16px grey icon and a
  13px semibold title. It reaches 12px past the content on each side. A 24px
  button (6px radius) can sit at its right.
- Rows: plain text on white. No cards, no zebra, no row borders. A 28px tile
  (8px radius) can lead a row. Totals sit under one hairline.
- One white surface. Few lines. Grey fills only for bands, hover, and the
  selected nav item. Color only on small status marks: a 16px colored icon
  with grey text.
- Properties: a 12px semibold grey group label, then label and value rows.
- Fields: 32px high, 8px radius, hairline border. A focused field has a 1px
  `--foreground` border and no ring. An invalid field has a `--destructive`
  border and a 12px message under it with a small icon.
- Dialog: white, 12px radius, 600px wide (480px for small ones). A 48px header
  with the title, an optional fact on the right, and a close button. The
  fields. A footer under a hairline with Cancel and the action, right-aligned.
- Empty state: one plain line and one action. No illustration.
- Lists show recent or active items, with the total in the band ("Recent 5 of
  11") and "View all …" at the bottom right.

## Product rules

- Design the real screen first. Every real field, action, state, and
  permission branch needs a place in Paper.
- You may improve layout, grouping, and wording. If a frame needs data or an
  action the app does not have, you may still design it, but list it in the
  report under "Needs app or Rails work". Keep such additions few.
- Words: "Fulfill", "Fulfilled", "Unfulfilled", "Partly fulfilled". Never
  "Deliver" or "Delivered". Say "Fulfill early" when money is still due. The
  existing Paper frames already use these words, and they are correct.
- Payment and fulfillment are two separate facts. Never merge them in one status.
- Payment methods: Cash and Bank transfer only. Recording a payment does not
  move money; do not word it as if it does.
- A sale has one line, quantity one. A ticket is sold for one session time.
- Keep permission limits visible: an action the role cannot use is absent, and
  a page the role cannot use says which permission it needs.
- Sample-data screens (Inbox, Agents) keep a "Sample data" mark.
- Simplicity: one task per screen. No taglines, helper paragraphs, or repeated
  labels. Keep record facts, errors, and consequences.
- Sample content: Chainsaw Gym, location Bangsar (also Mont Kiara, Petaling
  Jaya), currency RM, staff user "Kennedy · Owner". Reuse the member and
  product names already in the file.
- Names: Paper's names are settled. The pages are Home, Check-ins, and
  Products, with "product", not "offer". The app will be renamed to match.
- Sidebar: Paper's sidebar has Home, Members, Sales, Check-ins, Programs,
  Products, and Reports. Inbox, Agents, and Schedule join it. The full sidebar
  is designed once, on the Home page ("App — Sidebar with all pages"), and one
  later pass applies it to every frame. Do not change the sidebar of an
  existing artboard yourself. If your screen is Inbox, Agents, or Schedule,
  show its item, selected, in your own frames, drawn like the other items.

## Report

Write `docs/paper-redesign/reports/<your-slug>.md`. Short, plain sentences.

1. **Coverage.** A table: real screen or state → Paper artboard name →
   "existed", "added", or "not designed" (with the reason).
2. **Added.** Each new artboard and what it shows.
3. **Existing frames to update.** Each stale or wrong item you saw in an
   existing artboard, with the artboard name. You did not change these.
4. **Needs app or Rails work.** Anything a frame shows that the app cannot do.
5. **Open questions.** Decisions the user must make.
6. **Not verified.** Anything you could not check.

End your final message with the report path and a five-line summary.

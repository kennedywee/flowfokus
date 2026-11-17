# Sidebar nav update — pages B

File: Flowfokus Redesign. Source nav: "App — Sidebar with all pages", Home page.

The final nav has ten items: Home, Inbox, Agents, Members, Sales, Check-ins, Schedule, Programs, Products, Reports.

## Method

Seven-item navs (Programs, Program details, Session details, New program, Booking rules, Products, Reports, Home):

1. Copy the three new rows (Inbox, Agents, Schedule) from the source nav into each target nav.
2. Move them to positions 1, 2, and 6. The order becomes the final order.

The existing rows were not touched, so the selected row and its style stayed as they were. The copied rows are unselected, the same as in the source. One copy call and one move call covered up to 46 artboards.

Schedule page: the navs had eight items in a different order (Schedule after Programs), an older Schedule icon, and text without tabular figures. So I replaced the whole nav on each artboard:

1. Copy the source "Nav" frame into the sidebar, before the old nav.
2. Set the Home row to no fill and the Schedule row to `var(--accent)`, the source's selected style.
3. Delete the old nav.

Nothing outside the "Nav" frame was changed: not the brand row, the collapse button, the sidebar size, the footer, the content, dims, dialogs, or toasts.

## Per page

| Page | Changed | Skipped | Skip reason |
| --- | --- | --- | --- |
| Programs | 7 | 0 | — |
| Program details | 15 | 1 | "Exploration — Tickets in main content" has no sidebar |
| Session details | 13 | 2 | "Booking menus" and "Dialogs, menus and toasts" are sheets with no sidebar |
| New program | 13 | 0 | — |
| Booking rules & settings | 6 | 0 | — |
| Products | 42 | 0 | Includes the 18 "Option B · …" artboards |
| Reports | 19 | 0 | — |
| Home | 4 | 15 | Source artboard (not touched); "Dark theme" and "Collapsed sidebar" (excluded); 11 artboards that already had the ten-item nav; "Menus and top bar states" has no sidebar |
| Schedule | 7 | 0 | Whole nav replaced, Schedule selected |
| Inbox | 0 | all | Already matches the source |
| Agents | 0 | all | Already matches the source |

Total: 126 artboards changed.

Home artboards changed: "Home — Today", "App — ⌘K command menu", "App — Location switcher", "Home — First run". Home stays selected.

## Problems

None. No sidebar ran out of space. The nav grows by three rows; the spacer below the nav absorbs it. No artboard was resized.

## Verification

- Before and after: `get_tree_summary` (depth 1) on each edited page root. The artboard names, counts, and sizes are the same.
- Screenshots: the first artboard ("Programs — list") next to the source sidebar; then "Program details — Add sessions" (dimmed, dialog), "Session details — Booking cancelled by staff" (tall artboard), "New program — 7 · Discard" (dimmed), "1 · Pass credits — add a pass" (open menu), "Option B · Add price — filled" (dimmed), "Reports — list · date range open", "App — Location switcher", and "Schedule — Filter by program". In each, the order, spacing, icons, and selected row match the source. Dims, dialogs, menus, and footers are unchanged.
- Counts with `find_nodes` per page. Each count equals the number of artboards with a sidebar:
  - Inbox: Programs 7, Program details 15, Session details 13, New program 13, Booking rules 6, Products 42, Schedule 7.
  - Schedule: Programs 7, Program details 15, Session details 13, Booking rules 6, Reports 19. New program shows 22: 13 nav rows plus 9 "Schedule" section headings in the form content.
  - Agents on Home: 18 (17 expanded sidebars, plus one "Agents" text outside a sidebar; the collapsed rail has no labels).
- Inbox and Agents pages: I read the nav JSX of one artboard on each and compared it with the source. Same rows, icons, order, and styles. Inbox and Agents are selected, respectively. No change needed.
- Not checked: every artboard by screenshot. The method is the same on each, and the counts match.

# Sidebar nav update — pages A

File: "Flowfokus Redesign". Pages: Members, Member details, New member, Sales, Sale details, New sale, Check-ins.

## Result

All 104 artboards with the old seven-item nav now have the final ten-item nav: Home, Inbox, Agents, Members, Sales, Check-ins, Schedule, Programs, Products, Reports. Each artboard keeps the item that it had selected before. No artboard was added, removed, renamed, moved, or resized.

## Method

1. I read the source nav on Home › "App — Sidebar with all pages" with get_jsx. The rows are 32px high with a 2px gap and 4px top padding. Each row has a 16px icon, a 10px gap, a 13px/500 label, and 8px side padding. A selected row adds `background-color: var(--accent)`. An unselected row has no background.
2. I compared it with a target nav ("Members — list"). The Nav frame has the same styles, so a whole-frame swap gives an exact result.
3. On one artboard per selected item, I built a master nav. I duplicated the source Nav into the sidebar, placed it after the old Nav, moved the accent fill from Home to the selected row, and deleted the old Nav. I then took a screenshot to check it.
   - Members selected: "Members — list"
   - Sales selected: "Sales — list"
   - Check-ins selected: "Check-ins — 1 · Today"
4. For every other artboard, I duplicated the matching master into its sidebar, moved it after the old Nav, and deleted the old Nav. Each step used one batched call per page.

This method replaced only the Nav frame. The brand row, collapse button, spacer, footer, sidebar size, and everything outside the sidebar did not change. The new Nav also uses the source's Programs icon. The old Programs icon used a different path, so the icons now match the source exactly.

## Per page

| Page | Changed | Skipped | Skip reasons |
|---|---|---|---|
| Members | 9 | 0 | — |
| Member details | 13 | 1 | "Sale row — payment & fulfillment states" (state sheet, no sidebar). A stray text layer ("which o") is on the page. It is not an artboard, and I did not change it. |
| New member | 9 | 0 | — |
| Sales | 9 | 2 | "Sales — Payment rows by source" (state sheet). "Exploration — Record payment, bigger layouts" (exploration). |
| Sale details | 16 | 5 | "Sales — Dialogs and menu" and "Sales — Dialogs and menu · more states" (dialog sheets). "Exploration — Fulfill items dialog" and "Exploration — Sale details · one Items section…" (explorations). "Sale — Receipt (print / email)" (receipt). |
| New sale | 17 | 0 | — |
| Check-ins | 31 | 0 | — |
| **Total** | **104** | **8** | |

I found no collapsed rail sidebars, no navs with ten items already, and no sidebar too short for ten items.

## Selected item

- Members, Member details, and New member: Members is selected.
- Sales, Sale details, and New sale: Sales is selected.
- Check-ins: Check-ins is selected on 29 artboards. Two artboards, "Check-ins — 22 · Member page · Checked in" and "Check-ins — 23 · Member page · Denied", had Members selected because they show the member page. They keep Members selected.

Before I made changes, I confirmed the selected item on each page. I used find_nodes with `background-color: --accent` and `height: 32px`, and read the "Nav · …" row names.

## Unusual sidebars

- "Member details — Priya Nair" has the account menu drawn open. The menu is a separate layer in the Window, not part of the Nav. A screenshot after the change shows that the menu and the footer are unchanged.
- Dimmed artboards (dialog over the page) have the overlay as a separate layer above the Window. I changed only the Nav underneath. Screenshots of "Member details — Unlink sign-in", "New member — 4 · Discard", "New sale — 4b · Discard changes?", "Check-ins — 18 · Let in anyway", and "Check-ins — 23 · Member page · Denied" show the overlay and dialog are unchanged.

## Problems

None. One duplicate call on Check-ins (28 copies) returned more output than the tool can show. The copies were made, and I read the new IDs from the saved output file. The move results confirmed each copy went into the right sidebar.

## Verification

- **Structure:** after each page, I ran get_tree_summary on the page root at depth 1. The artboard lists, names, and sizes match the lists from before the change.
- **Counts:** for each page, I ran find_nodes with textValue "Schedule" and "Inbox". The counts equal the changed artboard counts: Members 9/9, Member details 13/13, New member 9/9, Sales 9/9, Sale details 16/16, New sale 17/17, Check-ins 31/31.
- **Screenshots (13):** the three master sidebars, plus "Members — no permission", "Member details — Priya Nair" (open account menu), "Member details — Unlink sign-in", "New member — 4 · Discard", "Sale details — #1061 access ended", "New sale — 4b · Discard changes?", "Check-ins — 18 · Let in anyway", and "Check-ins — 23 · Member page · Denied". All 13 show the ten items in order with even spacing. Each shows one selected row, and nothing else moved.

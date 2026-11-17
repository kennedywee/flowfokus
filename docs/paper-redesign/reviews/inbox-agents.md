# Inbox and Agents — design review

Reviewer pass on the two new pages: "Inbox" (`p-W-0`, 12 artboards) and "Agents" (`p-X-0`, 5 artboards). I compared them with "Home — Today" (`10C8-0`), "Member details — Priya Nair" (`DNR-0`), the Sales list (`LYF-0`, `UQH-0`), and the final sidebar (`1IXF-0`). I read `features/preview/Inbox.tsx`, `Agents.tsx`, `data.ts`, and `components/Filters.tsx`. I changed nothing in Paper.

Overall: both screens look like the same product. Window, top bar, sidebar, page head, bands, 52px rows, 28px buttons, and the three text sizes all match. The faults are small and fixable by editing the existing frames.

## Findings

### Must fix

None.

### Should fix

1. **Agents · every frame (`2PKZ-0`, `2Q0K-0`, `2R07-0`, `2QN2-0`, `2QTI-0`) · "Reads: Sample records" is not true.** The app reads no records. `answer()` in `Agents.tsx` returns prepared text by keyword match. Its own fallback says "no live records were searched". The app also says "Nothing is sent or changed". Paper keeps "Changes: Nothing" but drops "sent", while "Message drafts" sits under "Helps with". **Should be:** "Answers: Prepared replies" (or "Reads: Nothing") and "Sends or changes: Nothing". Keep the label and value rows of the Member details properties column.

2. **Inbox · every frame with a dot (`2CHB-0`, `2HQZ-0`, `2FWW-0`, `2G3S-0`, `2GAO-0`, `2GHK-0`, `2I4R-0`) · the unread dot uses `--tag-blue`.** The file uses `--tag-blue` in one other place: the dot on a member tag chip ("Student", `XRB-0`). That is a category color, not a state. The status colors are success, warning, and destructive. A blue dot is a second accent color, and it carries a different meaning on another screen. Unread is also shown already by the semibold title. **Should be:** a `--foreground` dot (ink), the same 7px size and the same fixed 8px slot. This keeps "color only for status marks" and still reads as unread.

3. **Inbox · every open-item frame and "Nothing selected" · the detail pane has a full-height hairline and is 400px.** The properties column on Member details (`DNR-0`) and Home (`10C8-0`) is 300px with no left hairline. The Agents page in this same set also uses a 300px column with no hairline. So the two new pages disagree with each other. Spacing already separates the pane, and the open row has the hover fill. **Should be:** follow the Member details properties column: 300px, 16px side padding, no hairline. The detail text is two lines today and fits in 268px. If the pane must stay wider, say why in the report.

4. **Inbox · "Loading" (`2LN9-0`), "Filter has no updates" (`2KO6-0`), "Did not load" (`2LR9-0`) · the detail pane disappears and the list grows to full width.** In the loaded frames the list is about 716px wide with the pane beside it. On load, the page will jump. A tab with no rows also makes the pane vanish. **Should be:** keep the same two-column layout. Loading keeps an empty pane. "Filter has no updates" keeps the pane with "Select an update to read it." (or empty). Only "Empty" (no updates at all) may drop the pane.

5. **Inbox · "Filter has no updates" (`2KO6-0`) · "Show all" sits about 1,000px from its line.** The line is at the left edge and the action is at the far right. The eye cannot pair them. **Should be:** follow Sales "No results" (`UQH-0`) for the action: a 28px secondary button "Show all", directly under or after the line. Keep the brief's rule of no icon tile. (`UQH-0` itself still has an icon tile; do not copy that part.)

6. **Inbox · every frame · the page head has the 40px tile.** The brief says list pages have a plain title, as in the Sales list. The Inbox is a list. **Should be:** plain "Inbox" title with the "Sample data" mark, as in `LYF-0`. Agents is not a list, and Home has a tile, so the Agents tile can stay.

7. **Inbox · "Membership ending open" (`2FWW-0`) · the Membership property uses the sale receipt icon.** **Should be:** the ID-card icon that the Membership band on Member details and the membership row tile on this page use. The receipt icon means "sale" everywhere else.

### Notes

8. **Inbox · every frame · the filter tabs.** The tabs follow the Activity filter on Member details (`DNR-0`): 24px items, 12px medium, the selected one with the `--accent` fill. They also match the app, which uses `Filters` (a single-choice toggle group). The Sales "Filter" menu with chips is for several facts combined (payment and fulfillment). Inbox has one exclusive choice of view. **Recommendation:** keep the tabs. If Rails later adds more kinds, keep "All, Unread, Resolved" as tabs and move the kinds into the Filter menu with chips, as on Sales.

9. **Inbox · rows against Home "Needs attention".** The rows match: 52px, 28px tile, 13px title, 12px grey line, same warning pie for a balance due and the same ID card for memberships. Two differences are reasonable: the time and dot replace Home's amount and chevron, and the amount moves into the grey line. The denied check-in uses a red "ban" tile, while Home groups the same sale under "unfulfilled" with a box tile. That is fine, because the inbox item is the denial event. No change needed.

10. **Inbox · "Payment due open" and others · the item actions sit in the pane, not the top bar.** "Open sale #1041" and "Mark resolved" act on the selected item, not the page. The pane is the right place. The top bar keeps the page action, "Mark all read". No change needed; record it in DESIGN.md when building.

11. **Inbox · "Resolved" (`2I4R-0`) · the resolved row still shows the warning pie, and the pane still shows "Balance due RM 180.00".** This is honest: resolving is manual and does not pay the sale. Keep it. If the user chooses self-resolving items (report, open question), redraw this frame.

12. **Agents · "Answer failed" (`2QTI-0`) · one line, "The answer did not load."** The Try again button says what to do, so it passes. For one style with the Inbox error row, consider the two-line form: "The answer did not load" and "Check your connection, then try again."

13. **Agents · staff and assistant are told apart by avatar shape and weight only** (staff 500, assistant 400, same ink). It reads, but weakly. The round "K" against the square bot tile does most of the work. Acceptable. Do not add color.

14. **Agents · "Composer focused" (`2R07-0`) · the caret is a typed "|" character.** It looks right in the frame. In code, use the real caret. The key hint uses `#FFFFFF99`, but that value is copied from the Member details comment button (`DS9-0`), so it is not new.

15. **Agents · `2R31-0` and the Inbox head frames are named "Member header".** Layer names were carried over from the clone. Rename when convenient.

## Categories with no findings

- Sidebar: every frame uses the final sidebar, matches `1IXF-0`, and selects Inbox or Agents correctly.
- Text sizes: only 20, 13, and 12px. Font: Figtree only.
- Buttons: 28px, dark primary and white secondary with a hairline.
- Composer: follows the comment box; focused, it has a 1px `--foreground` border and no ring. Send is disabled while empty.
- Bubbles, cards, gradients, row borders: none.
- Counts: the Unread count matches the dots in every All-tab frame (Nothing selected 3, Payment due 2, Membership ending 1, Staff note 2, Denied check-in 1, Payment recorded 2, All read 0). On the Resolved tab, "Unread 2" counts the hidden open items, as in the app.
- Loading shows no names, dates, or counts. Mark all read is disabled where nothing is unread.
- Error text is for staff and says what to do.
- Empty states are one plain line, no icon tile.
- Truth to the app: item kinds, filters, Mark resolved, Move back to inbox, Mark all read, and the three suggested prompts all match the code. Extra links ("Open sale", "Open Reports") are listed under "Needs app or Rails work".
- "Sample data" mark: present on all 17 frames.
- Artboards: no overlaps; 80px gaps.

## Honest while on sample data

With both items in the sidebar, each page must say in its own content what is fake: keep the "Sample data" mark, and make the Agents "Assistant" column state that replies are prepared and nothing is read, sent, or changed (finding 1). The Inbox items must not contradict Home's real "Needs attention" figures (today they agree), and the "Loading" and "Did not load" frames should be marked as states for real data only, so that nobody builds them into the sample screen.

## Verdict

Both screens are close to ready. They belong to the product, and every state is drawn. Fix findings 1 to 7 before building: the Agents claim, the unread dot color, the detail pane width and hairline, the pane that disappears, the far-away "Show all", the Inbox title tile, and the membership icon. None needs a redesign; each is an edit to the existing frames. After those edits, both screens are ready to build from.

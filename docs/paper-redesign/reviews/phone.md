# Phone layouts — review

Page: "Narrow screens" (`p-U-0`). I read the four original frames with screenshots and JSX. I screenshotted all 34 new frames once. I opened these desktop frames to check content: New sale `QDM-0`, Members `EVG-0`, Check-ins denial `103E-0`, Product details `Z31-0`, Session details `KSY-0`, Sales filtering `U3Z-0`, Schedule `19OX-0`, Program details `G2Q-0`, and Collapsed sidebar `2AEF-0`.

## Values in the original phone frames

- Status bar 54px. Header 48px: a 36px ‹ target, the parent name at 14/20 weight 500 in grey, and a 36px ⋯ target.
- Title 20/28, weight 600. Detail head: a 48px avatar or tile, then the title and a 13/20 grey subtitle.
- Action row: two equal 36px buttons, 8px radius, 13/20 weight 500, 8px gap, primary first. The Check in result rows use 32px buttons.
- Section band: 32px, 8px radius, `--muted`, 13px weight 600, with −8px side margins.
- Rows: a 14/20 weight 500 title over 12/16 grey text. Activity rows are 48px. Check in rows are 60px with a 36px avatar.
- Status: a 6px dot (3px radius) and 12/16 weight 500 text.
- Properties: 40px rows, a 96px label column, and 13/20 text.
- Search: a 40px field, 10px radius, `--muted` fill, 15px text, and a 2px `--foreground` border when focused.
- Tab bar: 84px, 8px top padding, 64px cells, 22px icons, 11/14 weight 500 labels. Check in is a 44×30 dark pill.

Most new frames keep these values exactly. Most were cloned from the originals.

## Findings

### Must fix

1. **Phone — Products (`34MX-0`): the Off-peak row breaks.** The price wraps to "RM / 150.00", and "22 in 30 days" wraps over three lines. Line 2 ("Membership · 30 days · Weekdays to 17:00 · Online, desk") also wraps and pushes the right column narrow. Each row is drawn as two text nodes, and the right node can shrink. Fix: give the amount column `flex-shrink: 0` and `white-space: nowrap`, and truncate line 2 to one line. Follow the Phone — Sales rows (`2XVD-0`).

2. **Phone — Check-ins (`2ZTR-0`), with `· denied` (`2ZXE-0`) and `· staff override` (`2ZZB-0`): this is a second version of the Check in tab screen.** The original "Phone — Check in" (`19A2-0`) is the root of that tab. It has the title "Check in" and a search field with a 2px focus border. The new frame is also a root of the Check in tab, but it uses another title ("Check-ins"), an unfocused grey field, and another placeholder ("Search members"). The brief says never to draw a second version of a screen. Fix: make this frame the empty-search state of Phone — Check in. Keep the title "Check in" and the original field. Use the tablet placeholder "Find member by name or phone" (`19F1-0`). Put the "Today 86 · 3 denied" band under the field. When staff type, the original results replace the list.

3. **Phone — Session details (`3219-0`): you cannot leave selection mode.** Two rows are selected, and the bar shows "2 selected · No-show · Check in". The bar has no ×, and the action row still says "Select". The desktop bar (`KSY-0`) has a × that ends the selection. Fix: add a 44px × at the left of the selection bar, or change "Select" to "Done" while rows are selected.

### Should fix

4. **Phone — Session details (`3219-0`): the collapsed groups hide rows and have no chevron.** The "Checked in 2" and "Cancelled 1" bands have no rows under them and no ›/⌄ mark. The desktop frame (`KSY-0`) shows a chevron on each band and keeps Checked in open with Priya Nair and Ahmad Faiz. A band with a leading dot is also a new band style. Fix: add the desktop chevron to the band (in a 44px target), show the two Checked in rows, and keep Cancelled collapsed.

5. **The property blocks on detail pages have no band.** Phone — Sale details (`2X5R-0`) puts its properties under a "Details" band. The original Member details (`197J-0`) puts every property group under a band ("Contact"). Phone — Session details (`3219-0`), Phone — Program details (`36X6-0`), and Phone — Product details (`36X7-0`) put their property rows straight under the action row, with no band or label. Fix: add a 32px "Details" band, as in Sale details.

6. **Phone — Members (`2ZJB-0`): the Hafiz Rahman row moves its time.** In the other rows, the last visit sits at the right of line 1. In this row, "RM 100.00 due" takes that place, so "Today 06:58" moves to the end of line 2. The column of times breaks. Fix: keep the time at the right of line 1, and put "RM 100.00 due" at the right of line 3, beside the status. The desktop frame (`EVG-0`) shows these as two separate columns.

7. **The search and Filter controls differ between lists.** On Phone — Programs (`34MW-0`) and Phone — Products (`34MX-0`), the search field has no magnifier. On Phone — Schedule (`312K-0`), Programs, and Products, the Filter button has no filter icon. Phone — Sales and Phone — Members have both icons. This confirms the designer's known issue and adds the Filter icon. Fix: use the Sales field and button everywhere.

8. **Phone — Sales · filter sheet (`2Y62-0`): the list does not agree with the count.** The chip and "Show 16 sales" say 16 sales match. Behind the sheet, the list shows two rows, then empty space. Fix: fill the visible list with matching rows (Partly paid and Awaiting payment) down to the sheet edge.

9. **One status uses two different marks.** "Cancelled" has a red dot on Phone — Program details (`36X6-0`) and a grey dot on the Session details band (`3219-0`). "Unpaid" has a grey dot in the filter sheet (`2Y62-0`) and a red dot on Session details (`3219-0`). The desktop frames have the same split: `G2Q-0` against `KSY-0`, and `U3Z-0` against `KSY-0`. Fix: choose one mark for each status, and change both the desktop and the phone frames. Suggestion: Cancelled is grey, and Unpaid is grey, as in the Sales filter.

10. **Phone — Settings · General (`3720-0`): the label column is wider than the rule.** Values start at about 128px, not at 112px (a 96px label column). Labels like "Member ID prefix" need the extra width. Fix: keep the frame, and add to rule 5 that a page may use a 112px label column when a label does not fit in 96px.

11. **Facts and actions dropped without a mention in the report:**
    - The Activity filter (All, Comments, Activity) and the comment field's attach and @ buttons, on every detail page (desktop `Z31-0`, `G2Q-0`, `KSY-0`). Staff will feel the loss of attachments on Sale details. Add the filter as a view picker in the Activity band, and put attach in the comment field.
    - The quantity field on New sale (`QDM-0`). The phone shows "Qty 1" as text, with no way to change it. Quantity is fixed at one for memberships and passes, but custom items can need it. Say where staff change it, for example in a sheet that opens when they tap the row.
    - Add sessions on Program details (`G2Q-0`). It should be in the ⋯ menu, but no frame shows that menu.
    - The Note edit pencil on Product details (`Z31-0`). The phone shows Note as a property with no way to edit it.

12. **Phone — Program details (`36X6-0`): the icon is wrong.** The head tile shows one person. The desktop frame (`G2Q-0`) and Phone — Session details show the two-person icon. Fix: use the desktop icon.

13. **Coverage of failure states on phones.** No phone frame shows a loading state, a field validation error (desktop `TIQ-0`), a failed request inside a sheet, or a no-permission page. The Phone rules do not cover them either. Fix: draw one form error (New member, with the 12px message under a 44px field) and one failed request in a sheet (Record payment). Then add a rule line for loading.

### Notes

14. **Rows drawn as one text node.** Phone — Schedule (`312K-0`), Phone — Programs (`34MW-0`), and Phone — Products (`34MX-0`) draw each row as a single text node with `<br>` line breaks. The status dot is an 8px "●" character, not the original 6px dot element. The result looks right, but builders must build each row from the Sales row component and must not copy this structure.

15. **Product details activity order (confirmed).** The phone (`36X7-0`) lists 1 Oct, 28 Sep, 12 Sep, which is correct time order. The desktop frame (`Z31-0`) lists 1 Oct, 12 Sep, 28 Sep, which breaks time order. Keep the phone order and fix the desktop frame.

16. **The desktop frames disagree with each other, and the phone frames follow Schedule.** The desktop Home, as drawn in "App — Collapsed sidebar" (`2AEF-0`), shows HIIT 30 as "9 of 14 booked", Yoga Flow as "Full · 3 waiting", and today as Wednesday 4 Nov. The desktop Schedule (`19OX-0`) and Phone — Schedule show HIIT 30 as "Full", Yoga Flow as "9 of 14", and today as Thursday 5 Nov. The phone is consistent with Schedule. Fix this in a desktop pass.

17. **The Check in tab never looks selected.** In all the original frames, the Check in pill is dark and its label uses `--foreground` on every screen. So the tab looks the same on Check in as on Home. This comes from the originals. Consider a grey label when another tab is selected.

18. **Phone — Sale details · toast (`2XJK-0`).** The toast covers half of the "Kennedy · Today 09:41" activity row, so a clipped "Kenned…" shows between the rows. This is correct floating behavior, but a clean scroll position would read better in the frame.

19. **Phone — Sign in (`37KH-0`)** uses 24px side padding. Every other frame uses 16px. This is acceptable for a page with no tab bar, but write it into the rules or use 16px.

20. **Field text at 15px.** The original search field uses 15px, and the new fields follow it. iOS Safari zooms the page when a focused input has text smaller than 16px. In code, use 16px for input values, or prevent the zoom some other way.

21. **Phone — More (`2WY6-0`)** has no location app bar, but rule 1 says a root page uses one. This is right, because More holds the Location row itself. Add More as an exception in rule 1.

22. **Tablet — Check-ins · rail with all pages (`3801-0`).** The rail lists Home, Inbox, Agents, Members, Sales, Check-ins (selected), Schedule, Programs, Products, and Reports, in sidebar order. The icons match "App — Collapsed sidebar" (`2AEF-0`). The frame keeps the original tablet layout, with no top bar, so the organization and location switchers are not visible on tablets. The designer reported this. Decide it in the tablet pass.

## Touch targets under 44px

From the original frames, kept:
- ‹ and ⋯ in the header: 36×36 in a 48px bar.
- The search icon in the app bar: 36×36. The location switcher (the tile, the name, and ⇕): about 22px of text height in a 48px bar.
- Action-row buttons: 36px. The Check in result buttons: 32px, in 60px rows.
- Tab bar cells: 64px wide. The content is about 46px high, in an 84px bar.

Added by the new frames:
- The filter chip on Sales and Members: 32px, with a × of about 16px (`2XVD-0`, `2Y62-0`, `2ZJB-0`, `2ZNI-0`).
- The toast action "Print receipt": 32px (`2XJK-0`).
- The filter sheet header: ‹ is 36px and "Clear" is 36px (`2Y62-0`).
- The category tabs in Add products (All, Memberships, Passes): about 36px (`2ZDC-0`).
- The segmented controls Repeat weekly / Specific dates and Anyone / Members with a tag: about 36px (`37KF-0`, `37KG-0`).
- The band "+" on Program details Tickets (`36X6-0`): 24px. The "+" for Tags and Note on New member: about 20px icons in 40px rows (`2ZQX-0`).
- Row ⋯ on Sale details payments and on Settings · Staff: 36px buttons inside 56–76px rows.
- Text links: "Show 5 more", "Show 1 earlier event", "View all 142 holders →", "Replace", and "Forgot password" (16–20px text).
- Mark all read and the view picker on Inbox, New conversation on Agents, and This month on Reports: 36px, the same as the action row.
- The Remove × on New sale product and payment rows: about 20px icons in 56–60px rows.

Fix: give every one of these a hit area of at least 44×44. Use padding or a pseudo-element, not a bigger visual. The rows are tall enough for that. The chip × and the toast action need the larger hit area most, because they sit near other targets.

## Categories with no findings

- Tab bar: no frame has a missing or doubled tab bar. No frame selects the wrong tab. Members, Sales, More, and the Check in pages select the right tab. Search and Sign in correctly have no tab bar.
- Artboard height: no content is cut off at the bottom. No full-height frame is taller than its content.
- Content under bars: the create bars, the selection bar, and the composer sit in the layout above the tab bar. They cover no content. Sheets cover the tab bar, as rule 7 says.
- Words: "Fulfill", "Fulfilled", and "Partly fulfilled" are correct. Nothing uses "Deliver". Page names match Paper's names.
- Sheet and bar buttons: all are 44px. Cancel is at the left and the action at the right, with an 8px gap.
- Sample data: Inbox and Agents show the "Sample data" mark.

## Judgement on the patterns

- **More.** This is right. The pages follow the sidebar order (Inbox, Agents, Schedule, Programs, Products, Reports, then Settings). The switchers, Theme, What's new, and Sign out are present. More sits under the thumb. Sign out is the last row, just above the tab bar, so a slip can sign staff out. Ask for a confirm, or put 24px of space above Sign out.
- **Search.** Good. The focused field and Cancel at the top follow platform habits, and the keyboard opens with it. Results are grouped (Members, Actions) with no key hints. The field sits at the top, out of thumb reach, but this is normal for search. The search icon in the app bar is the only way in, and that is acceptable.
- **Sheets.** Good, and right for one-handed use. Cancel and the action sit at the bottom in 44px buttons. The confirm (`2ZA6-0`) has no grabber, matching "Discard changes?". Its two buttons are 8px apart, with the destructive one at the right, under a right thumb. Increase the gap to 12px, or keep it because it matches the desktop order. The menu sheet (`2XFS-0`) has 48px rows and a separate Cancel, which is good.
- **Toast.** It sits 12px above the tab bar and is not covered. No frame shows a toast on a page with a create bar. Add one line to rule 8: the toast sits above any bottom bar.
- **Sticky create bar.** It works. But with the status bar (54px), header (48px), create bar (64px), and tab bar (84px), the form gets about 594px of 844px. When the keyboard is open, only about 250px remain. See the recommendation below.
- **Inbox view picker.** Good. "All · Unread 2 ⇕" names the current view and opens a sheet. This is better than six tabs at 390px. Draw the view sheet once, or say in rule 7 that it is a single-choice sheet.

## Coverage of the screens not drawn

- **Settings index.** A builder can build it without a frame. It is a list of links, the same as the page list on More (icon, name, ›, 44px rows) under a "Settings" title with the location app bar.
- **Location picker sheet.** A builder can build it, but rule 7 does not cover it. Rule 7 describes sheets with a footer and an action, and a picker applies on tap. Add one line: "A single-choice sheet has a grabber, a header, and 48px rows with a check on the current choice. It closes on tap and has no footer." Then no frame is needed.
- **Inbox item detail.** This needs a frame. On the desktop, the right column mixes record facts, the linked record, suggested actions, and a reply. The phone rules do not say which of these become actions, properties, or a bottom composer. Moving to the next or previous item is also undefined.

## Are the Phone rules enough?

They are enough for lists, detail pages, and simple forms. They leave out these things:
- Loading, validation error, failed request in a sheet, and no-permission states.
- The type sizes the originals use outside rule 2: 14px row titles, the 14px back label, 11px tab labels, 15px field text, and 12px status text.
- Row heights by kind: 48px activity, 56px money rows, 60px member rows with a 36px avatar. Also when a row shows a ›.
- The status dot as a 6px element, and the rule that text always goes with it.
- Single-choice sheets (see the location picker above).
- The toast position when a bottom bar is present.
- What the create bar does when the keyboard is open.
- Exceptions: More has no location app bar, Sign in uses a 24px gutter, and a 112px label column is allowed.
- Hit areas: every target is 44×44, even when the visual is 36px or smaller.

## Recommendations on the open questions

1. **In-page button height.** Keep the visual height at 36px, as in the originals. In code, give each button a 44px hit area with an invisible extension. The 20px gaps around the action row leave room for it. Use 44px buttons only in bottom bars and sheets, as now.
2. **Hiding the tab bar on forms.** Yes. Hide it on full-page create forms (New sale, New member, New program, New product). Treat them like Search: they are tasks with a clear exit (‹, or Discard). A tab tap would raise the discard confirm anyway. This gives the form 84px back. Keep the create bar at the bottom with 34px of safe area. Keep the tab bar on detail pages and on Settings · General.
3. **Check-ins in More.** No. Make the Check in tab one screen: the original search on top, today's check-ins below when the search is empty (finding 2). A second entry in More would add a second way to the same list.
4. **Dot status marks.** The dots are enough, because every dot on a phone has text beside it. "Partly paid" and "Awaiting payment" differ by their words, which is clear. Keep two rules: a dot never appears without text (the Inbox unread dot needs an accessible "Unread" label), and one status has one colour on every screen (finding 9).

## Verdict

The set is close to ready to build. The patterns are sound and fit one-handed use at a front desk: the tab bar, More, sheets, the toast, Search, and the create bar. Most frames copy the original values exactly. Three things block the build. The Products list row breaks. The Check in tab has two competing root screens. Session details has no way to leave selection. Fix those three, and add the Details bands, the missing icons, and the hit-area rule. Then a builder can build the phone shell and every drawn screen from these frames. Before building Inbox item detail and the phone error states, draw one frame for each.

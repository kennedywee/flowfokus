# Phone layouts — design report

Page: "Narrow screens" (`p-U-0`) in the Paper file "Flowfokus Redesign".
The four original frames are unchanged: Phone — Home, Phone — Member details, Phone — Check in, and Tablet — Check-ins. There are 39 new frames below them and to the right:

- Row 1 (y 924): phone patterns, error and loading states.
- Row 2 (y 1848): lists and other single-viewport screens (390 × 844).
- Row 3 (y 2772): detail pages and long forms, drawn at their full scroll height.
- The tablet frame sits right of the original tablet frame (y 0).

Every frame uses the original status bar and the original page header or location app bar. Every frame except Search, Sign in, and the create forms also uses the original tab bar.

## Phone rules

1. **Header.** A root page (a tab, or a page opened from More) uses the location app bar: org tile, location, ⇕, and Search. A child page uses the back header: ‹ and the parent page name, with ⋯ when the page has a menu. Exceptions: More has no app bar, because it holds the Location row itself. The Check in tab uses its own title and search field.
2. **Title block.** The title is 20/28 semibold. A detail or form page puts a 48px tile before the title, with a 13px grey subtitle. A list page has a plain title. Row titles are 14/20 weight 500, secondary text is 12/16, field values are 15px, and tab labels are 11px.
3. **Actions.** Up to two 36px buttons in a row under the title, primary first. Everything else goes in the ⋯ menu sheet. There are no key hints.
4. **Lists.** No column headers and no sideways scroll. Line 1 holds the main fact, with the amount or time at the right; the amount never wraps (`flex-shrink: 0`). Line 2 holds the secondary facts on one line and truncates. Line 3 holds the status: a 6px dot, which always has its text beside it. Each status has one colour on every screen. Search is a 40px grey field with a magnifier. Filter is a button with the Filter icon. An active filter shows as a chip under the search.
5. **Sections and properties.** Use the 32px grey band from the original frames. A group that collapses has a ⌄ or › at the left of the band. The desktop properties column moves under the page head, under a "Details" band, as 40–44px label/value rows with a 96px label column. Use 112px when a label does not fit (Settings · General). Activity has a view picker (All ⇕) in its band, and the comment field has attach and @.
6. **Forms.** Fields are 44px high with a 10px radius and a 13px label above. In code, use 16px input text to stop iOS zoom. A full-page create form hides the tab bar. The create bar sits at the bottom of the screen (64px plus 34px safe area), and ‹ in the header leaves the form, through the discard confirm when it has changes. An invalid field gets a `--destructive` border and a 12px message with an icon under it. A summary line sits under the title.
7. **Sheets.** Dialogs, menus, filters, and confirms become bottom sheets over `--overlay`, and they cover the tab bar. A form sheet has a grabber, a 48px header (title, and a fact at the right), the body, and a footer with Cancel and the action (44px buttons, 34px safe area). A failed request shows a red message with an icon above the footer, and the fields keep their values. A confirm has no grabber and no header band. A single-choice sheet (the location picker, the Inbox view picker, the Activity view picker) has a grabber, a header, and 48px rows with a check on the current choice. It closes on tap and has no footer.
8. **Toasts.** A toast sits 12px above the tab bar or any bottom bar, 16px from each side. It holds one line and at most one action.
9. **Empty, loading, and error states.** Empty and error states are one grey line and at most one 36px button, centred where the content would be. While loading, grey placeholder bars stand in for the rows. The title, actions, and search stay usable. A detail page that did not load keeps its back header and shows one line with Try again.
10. **Tab bar and tap areas.** The tabs are Home, Members, Check in, Sales, and More, and the tab that owns the page is selected. Pages reached from More show More selected. Check-ins live only in the Check in tab. Every tappable element gets a tap area of at least 44 × 44px in code, even when it looks smaller: the chip ×, the toast action, icon buttons, band buttons, text links, and steppers. Sign in uses a 24px gutter; every other page uses 16px.

## Coverage

| Desktop screen or state | Phone frame | Status |
| --- | --- | --- |
| Home | Phone — Home | existed |
| Member details | Phone — Member details | existed |
| Check in (search with results) | Phone — Check in | existed |
| Check-ins list (ZFR-0) | Phone — Check in · today's check-ins | added (empty-search state of Check in) |
| Denial dialog (103E-0) | Phone — Check in · denied | added |
| Staff override (22MC-0) | Phone — Check in · staff override | added |
| Members list (EVG-0) | Phone — Members | added |
| Members · no results | Phone — Members · no results | added |
| New member (V9D-0) | Phone — New member | added |
| New member · field errors | Phone — New member · field errors | added |
| Sales list (LYF-0) | Phone — Sales | added |
| Sales · filtering (U3Z-0) | Phone — Sales · filter sheet | added |
| Sales · load error | Phone — Sales · load error | added |
| Sales · loading | Phone — Sales · loading | added (loading pattern) |
| Sale details (NHI-0) | Phone — Sale details | added |
| Sale details · did not load | Phone — Sale details · did not load | added (detail error pattern) |
| Sale ⋯ menu (NY5-0) | Phone — Sale details · menu sheet | added |
| Record payment dialog (Q71-0) | Phone — Sale details · record payment sheet | added |
| Record payment · request failed | Phone — Sale details · record payment failed | added |
| Toast after an action (TWC-0) | Phone — Sale details · toast | added |
| New sale (QDM-0) | Phone — New sale | added |
| Add products dialog (P6M-0) | Phone — New sale · add products sheet | added |
| Discard this sale? (TP2-0) | Phone — New sale · discard confirm | added |
| Schedule (19OX-0) | Phone — Schedule | added |
| Session details (KSY-0), with selection | Phone — Session details | added |
| Programs list (FMN-0) | Phone — Programs | added |
| Program details (G2Q-0) | Phone — Program details | added |
| New program (VYE-0) | Phone — New program | added |
| Products list (Y2Z-0) | Phone — Products | added |
| Product details (Z31-0) | Phone — Product details | added |
| New product (YHI-0) | Phone — New product | added |
| Reports list (10NF-0) | Phone — Reports | added |
| Sales report (10WG-0) | Phone — Sales report | added |
| Settings · Staff (17SU-0) | Phone — Settings · Staff | added |
| Settings · General (18JQ-0) | Phone — Settings · General | added |
| Settings index | — | no frame needed. It is a plain list of the settings sections (General, Locations, Staff, Payments, Booking rules, Profile), built like the page list on "Phone — More". |
| Sign in (17S8-0) | Phone — Sign in | added |
| Inbox (2CHB-0) | Phone — Inbox | added |
| Inbox item detail (right column) | Phone — Inbox · item open | added |
| Agents (2Q0K-0) | Phone — Agents | added |
| ⌘K command menu (1744-0) | Phone — Search | added |
| Location switcher (17B4-0) | Phone — More (Workspace rows) | added. The picker is a single-choice sheet (rule 7), so it needs no frame. |
| Sidebar with all pages (1THL-0) | Phone — More | added |
| Collapsed sidebar (2AEF-0) | Tablet — Check-ins · rail with all pages | added |
| No-permission page | — | not drawn. It follows rule 9: one line that names the permission, with no button. |

## Added

- **Phone — More.** Pages in sidebar order, then Settings. Below them, Workspace (Organization and Location switchers) and Kennedy · Owner (Theme, What's new, Sign out).
- **Phone — Search.** A focused field with Cancel, then Members and Actions results.
- **Phone — Sale details** and its states: the menu sheet, record payment sheet, record payment failed, toast (the page after the payment), and did not load.
- **Phone — Sales** and its states: filter sheet (all visible rows match the chip), load error, and loading.
- **Phone — New sale**, with add products sheet and discard confirm. These have no tab bar. Custom items have a quantity stepper.
- **Phone — Members**, no results; **New member**, field errors.
- **Phone — Check in · today's check-ins**, denied, and staff override. These are states of the original Check in screen.
- **Schedule, Session details** (with a × that ends selection, and Done in the action row), **Programs, Program details** (Add sessions in the Sessions band), **New program, Products, Product details** (Note edit pencil), **New product, Reports, Sales report, Settings · Staff, Settings · General, Sign in, Inbox, Inbox · item open, Agents.**
- **Tablet — Check-ins · rail with all pages.** The rail shows all ten pages in sidebar order.

### Facts dropped on phones

- **Avatars on sale rows.** Line 1 names the member instead.
- **The Display button on lists.** Phone rows have one fixed layout.
- **Share bars in the Sales report.** The share % stays as text.
- **Subtotal on New sale.** It equals Total; the create bar repeats the total and the amount due.
- **The pager.** Lists end with a count and load more on scroll.
- **The end of line 2 on long product rows** (Off-peak: "· Online, desk"). Line 2 truncates to one line; the full facts are on Product details.
- **Quantity on membership and pass lines.** It shows as "Qty 1" text, because Rails fixes it at one. Only custom items get the stepper.

## Desktop inconsistencies to fix in a desktop pass

- **Cancelled:** red on Program details (G2Q-0), grey on Session details (KSY-0). The phone uses grey everywhere.
- **Unpaid:** grey in the Sales filter (U3Z-0), red on Session details (KSY-0). The phone uses grey everywhere.
- **Product details (Z31-0):** activity is out of time order (1 Oct, 12 Sep, 28 Sep). The phone uses time order (1 Oct, 28 Sep, 12 Sep). Fix the desktop frame.
- **Home vs Schedule:** "App — Collapsed sidebar" (2AEF-0) shows HIIT 30 "9 of 14 booked", Yoga Flow "Full · 3 waiting", and today as Wed 4 Nov. Schedule (19OX-0) shows the opposite and Thu 5 Nov. The phone follows Schedule.

## Conflicts

None.

## Needs app or Rails work

- A phone shell: the tab bar, the More page, bottom sheets in place of dialogs and menus, single-choice sheets, and toasts placed above bottom bars.
- The phone Search page. It reuses the `CommandMenu` results without key hints.
- The create bar on full-page forms, with the tab bar hidden. Also the unsaved-changes bar and the Session details selection bar.
- 44 × 44px tap areas on every small control.
- Everything the desktop reports already list as missing: member IDs and phones, tags, card and e-wallet payments, attachments, comments, Book member, Add sessions, quantity on custom items, and Inbox and Agents data.

## Open questions

1. **Check in pill.** The original tab bar shows the Check in pill dark on every screen, so the tab never looks selected. Should its label turn grey when another tab is selected?
2. **Sign out.** Sign out is the last row on More, just above the tab bar. Should it ask for a confirm?
3. **Tablet top bar.** The tablet frame has no top bar, so the organization and location switchers do not show on tablets. Decide this in the tablet pass.
4. **Override entry.** The denial sheet (from desktop 103E-0) has Close and New sale only. The staff override sheet exists, but neither the desktop nor the phone shows which control opens it. Should the denial sheet get "Let in anyway"?

## Not verified

- I did not draw dark mode.
- Schedule, Programs, and Products draw each row as one text node with an 8px "●" glyph. Build these rows from the Sales row component, with the 6px dot element.
- The toast frame scrolls so that the toast covers half of an activity row. That is correct floating behaviour, but the frame reads a little cluttered.

## Review fixes

1. Products row wrapping: fixed. Name and price are on line 1, facts on line 2, and the amount column does not shrink.
2. Second Check in root: fixed. The frame is now "Phone — Check in · today's check-ins", with the original title, the focused field, and the placeholder "Find member by name or phone". Denied and staff override follow it.
3. No way out of selection: fixed. The selection bar has a 44px ×, and the action row says Done.
4. Session groups without chevrons: fixed. Every group band has ⌄ or ›. Checked in shows Priya Nair and Ahmad Faiz. Cancelled stays collapsed.
5. Details band missing: fixed on Session details, Program details, and Product details.
6. Members time column: fixed. Hafiz Rahman's last visit sits on line 1, and "RM 100.00 due" sits at the right of line 3.
7. Search and Filter icons: fixed on Programs, Products, and Schedule. All lists now match Sales.
8. Filter sheet list vs count: fixed. Matching rows (Kevin Ong, Siti Aminah) fill the list to the sheet edge.
9. One status, two marks: fixed on the phone frames. Cancelled and Unpaid are grey; the desktop split is listed above.
10. Settings · General label column: fixed in rule 5 (112px when needed).
11. Dropped facts: fixed. Five detail frames got the Activity view picker, and the comment field has attach and @. Custom items on New sale have a quantity stepper. Program details has Add sessions. Product details has the Note edit pencil.
12. Program details icon: fixed. It is the two-person icon.
13. Failure states: fixed. Added New member · field errors, Record payment failed, Sales · loading, and Sale details · did not load. Rules 6, 7, and 9 cover them.
14. One-text-node rows: not changed. Noted under "Not verified" for builders.
15. Product details activity order: kept in time order; the desktop frame is listed to fix.
16. Desktop Home vs Schedule: listed for the desktop pass.
17. Check in pill: open question 1.
18. Toast position: not changed; noted under "Not verified".
19. Sign in gutter: written into rule 10.
20. 15px field text: written into rule 6 (16px in code).
21. More has no app bar: written into rule 1 as an exception.
22. Tablet top bar: open question 3.
- Hit areas under 44px: rule 10 covers every small target the review listed.
- Tab bar on forms: done. New sale, New member, New program, New product, the discard confirm, and the add products sheet have no tab bar, and the create bar sits at the bottom.
- Inbox item detail: added.

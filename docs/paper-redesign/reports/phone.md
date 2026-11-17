# Phone layouts — design report

Page: "Narrow screens" (`p-U-0`) in the Paper file "Flowfokus Redesign".
The four original frames (Phone — Home, Phone — Member details, Phone — Check in,
Tablet — Check-ins) are unchanged. 34 new frames sit below and to the right of them:

- Row 1 (y 924): the phone patterns.
- Row 2 (y 1848): list and full-height screens, each one viewport (390 × 844).
- Row 3 (y 2772): detail pages and long forms, drawn at full scroll height.
- The tablet frame sits right of the original tablet frame (y 0).

Every frame uses the original status bar, the original page header or location
app bar, and the original tab bar. Most were cloned from the originals.

## Phone rules

1. **Header.** A root page (a tab, or a page opened from More) uses the location app bar: org tile, location, ⇕, and Search at the right. A child page uses the back header: ‹ and the parent page name, with ⋯ at the right when the page has a menu.
2. **Title block.** The title is 20/28 semibold. A detail or form page puts a 48px tile before the title, with a 13px grey subtitle. A list page has a plain title.
3. **Actions.** Up to two buttons in a row under the title, 36px high, primary first. Everything else goes into the ⋯ menu sheet. There are no key hints.
4. **Lists.** No column headers and no sideways scroll. Line 1 holds the main fact and the amount or time at the right. Line 2 holds the secondary facts, joined with "·". Line 3 holds status marks: a small coloured dot and 12px text. Search is a 40px grey field under the actions. An active filter shows as a chip under the search.
5. **Sections and properties.** Use the 32px grey band from the original frames. The desktop properties column moves under the page head as 40–44px label/value rows, with a 96px label column.
6. **Forms.** Fields are 44px high with a 10px radius, a 15px value, and a 13px label above. Two short fields may share a row. The primary action (Create sale, Create member, and so on) sits in a 64px bar above the tab bar and stays visible while the page scrolls. The bar can show a summary at the left, for example the total and the amount due.
7. **Sheets.** Dialogs, menus, filters, and confirms become bottom sheets over a dim page (`--overlay`). They cover the tab bar. A sheet has a grabber, then a 48px header with the title and a fact at the right, then the body, then a footer with Cancel and the action. Footer buttons are 44px, with 34px of bottom safe area. A confirm has no grabber and no header band, matching "Discard changes?".
8. **Toasts.** A toast sits 96px from the bottom, just above the tab bar, 16px from each side. It holds an icon, one line, and at most one action.
9. **Empty and error states.** One grey line and at most one 36px button, centred in the list area. There is no button that repeats the action row.
10. **Tab bar.** The tabs are Home, Members, Check in, Sales, and More. The tab that owns the page is selected. Pages reached from More (Inbox, Agents, Schedule, Programs, Products, Reports, Settings) show More selected. Check-ins lives under the Check in tab. Sign in has no tab bar.

Touch targets: rows are 44px or taller. Bottom bar and sheet buttons are 44px. Buttons in the in-page action row stay 36px high, as in the original frames. The 8px gap and the row padding give each one a hit area of about 44px.

## Coverage

| Desktop screen or state | Phone frame | Status |
| --- | --- | --- |
| Home (1THL-0, Home page) | Phone — Home | existed |
| Member details | Phone — Member details | existed |
| Check in (search) | Phone — Check in | existed |
| Members list (EVG-0) | Phone — Members | added |
| Members · no results | Phone — Members · no results | added |
| New member (V9D-0) | Phone — New member | added |
| Sales list (LYF-0) | Phone — Sales | added |
| Sales · filtering (U3Z-0) | Phone — Sales · filter sheet | added |
| Sales · load error | Phone — Sales · load error | added |
| Sale details (NHI-0) | Phone — Sale details | added |
| Sale ⋯ menu (NY5-0) | Phone — Sale details · menu sheet | added |
| Record payment dialog (Q71-0) | Phone — Sale details · record payment sheet | added |
| Toast after an action (TWC-0) | Phone — Sale details · toast | added |
| New sale (QDM-0) | Phone — New sale | added |
| Add products dialog (P6M-0) | Phone — New sale · add products sheet | added |
| Discard this sale? (TP2-0) | Phone — New sale · discard confirm | added |
| Check-ins list (ZFR-0) | Phone — Check-ins | added |
| Denial dialog (103E-0) | Phone — Check-ins · denied | added |
| Staff override (22MC-0) | Phone — Check-ins · staff override | added |
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
| Sign in (17S8-0) | Phone — Sign in | added |
| Inbox (2CHB-0) | Phone — Inbox | added |
| Agents (2Q0K-0) | Phone — Agents | added |
| ⌘K command menu (1744-0) | Phone — Search | added |
| Location switcher (17B4-0) | Phone — More (Workspace rows) | added; the picker itself is a list sheet, not drawn |
| Sidebar with all pages (1THL-0) | Phone — More | added |
| Collapsed sidebar (2AEF-0) | Tablet — Check-ins · rail with all pages | added |
| Settings index (Locations, Payments, Booking rules, Profile) | — | not designed. It is a list of links, like the Pages list on More. |
| Inbox item detail (right column on desktop) | — | not designed. Tapping a row opens a child page with the detail column as properties. |
| Sales list · no sales | — | not drawn. It follows the no-results frame with one line and no button, because New sale is already in the action row. |

## Added

- **Phone — More.** The More tab. It lists the pages in sidebar order (Inbox, Agents, Schedule, Programs, Products, Reports), then Settings. A Workspace band holds the Organization and Location switchers. A "Kennedy · Owner" band holds Theme, What's new, and Sign out. More is selected in the tab bar.
- **Phone — Search.** Opens from the search icon in the location app bar. A focused 40px field with Cancel, then Members results and Actions ("Check in Priya Nair", "New sale for Priya Nair"). It has no tab bar and no key hints.
- **Phone — Sale details.** Head with "Partly paid" and "Fulfilled" marks, then Record payment and Send invoice. Details as properties, then Items with the total, then Payment with the balance due, then Activity with the comment field.
- **· menu sheet.** The ⋯ menu as a sheet. Record payment, Send invoice…, Renew at agreed price, Print receipt, Email receipt…, Refund…, End access… (red), then Cancel. Fulfill items and Void sale are absent, because the sale is fulfilled and partly paid.
- **· record payment sheet.** Method (Cash, Bank transfer, Card, E-wallet in a 2 × 2 grid), Amount with a "Full" mark, Reference, Attachments, then Cancel and Record payment.
- **· toast.** The page after the payment, scrolled to Payment. It shows a new RM 100.00 cash row, Balance due RM 0.00, and the new activity event. The toast "RM 100.00 cash recorded" with Print receipt sits above the tab bar.
- **Phone — Sales**, **· filter sheet**, **· load error.** Three-line sale rows. The filter frame shows the chip "Payment is Partly paid, Awaiting payment", only the matching rows, and the Payment choices sheet with counts and "Show 16 sales".
- **Phone — New sale**, **· add products sheet**, **· discard confirm.** Member and Location come first (as DESIGN.md says for phones), then Products, Payment, and Note. A bar shows "RM 530.00 · RM 230.00 due" and Create sale.
- **Phone — Members**, **· no results**, **Phone — New member.**
- **Phone — Check-ins**, **· denied**, **· staff override.** These sit under the Check in tab: the search field on top, then today's check-ins in a band with a Filter button.
- **Phone — Schedule**, **Phone — Session details** (with 2 rows selected and a "2 selected · No-show · Check in" bar), **Programs**, **Program details**, **New program**, **Products**, **Product details**, **New product**, **Reports**, **Sales report** (one-path bar chart), **Settings · Staff**, **Settings · General** (unsaved bar with Discard and Save changes), **Sign in**, **Inbox**, **Agents** (composer bar above the tab bar).
- **Tablet — Check-ins · rail with all pages.** A copy of the original tablet frame. The rail now lists all ten pages in sidebar order: Home, Inbox, Agents, Members, Sales, Check-ins (selected), Schedule, Programs, Products, Reports.

Facts dropped on phones, following the original phone frames:
- Avatars on sale rows. Line 1 shows the member name instead.
- The Display button on lists.
- The share bars in the Sales report. The share % stays as text.
- Subtotal on New sale, because it equals Total.
- The pager. Lists show a count at the end and load more on scroll.

Member tags appear as plain text on line 2 of Members rows, for example "Corporate · Acme".

## Conflicts

None found.

## Needs app or Rails work

- A phone shell: the bottom tab bar, the More page, and sheets in place of dialogs and menus.
- The phone search page. It reuses `CommandMenu` results without key hints.
- Sticky action bars for full-page forms, the unsaved-changes bar, and the Session details selection bar.
- Everything the desktop frames already list as missing in their own reports. For example: member IDs and phones, tags, card and e-wallet payments, attachments, Book member, and Inbox and Agents data. The phone frames show the same facts.

## Open questions

1. **Action row height.** Should in-page action buttons stay 36px, as in the original frames, or grow to 44px like the sheet and bar buttons?
2. **Primary action on long forms.** I put Create … in a bar above the tab bar. The original frames place actions under the title. On a long form that row scrolls away, so I chose the bar. Should forms also hide the tab bar to free space?
3. **Check-ins under the Check in tab.** I put today's check-ins under the Check in search. Should Check-ins also appear in More?
4. **Inbox views.** The desktop tabs (All, Unread, Payments, Memberships, Desk, Resolved) do not fit at 390px. I used a view picker button. Is that acceptable?
5. **Status marks.** The original phone frames use a 6px dot, and the desktop uses 16px icons (pies, rings). I followed the phone dot. Partly paid and Awaiting payment therefore differ only by text.

## Not verified

- I did not read the app code for phone breakpoints. This task was translation of Paper frames only.
- I did not draw dark mode.
- The tablet frame keeps the original tablet layout. It has no top bar or breadcrumb. I did not reconcile it with the desktop collapsed-sidebar top bar.
- Some list frames use a search field without the magnifier icon (Programs, Products). That is a small inconsistency to fix in a review pass.
- Product details orders activity by time (1 Oct, 28 Sep, 12 Sep). The desktop frame shows 1 Oct, 12 Sep, 28 Sep.

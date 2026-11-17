# Review — Home and app chrome

Page "Home" (`p-K-0`) in "Flowfokus Redesign". I reviewed against
`docs/paper-redesign/brief.md`, the designer's report `reports/home.md`, and
`apps/portal/DESIGN.md`. I took screenshots of every new artboard and its
original, and I read exact values with `get_jsx` and `get_computed_styles`.
I did not change the file.

## Findings

### Must fix

1. **App — Dark theme (`2BPD-0`). Icon strokes keep the light grey.** Every
   SVG stroke that uses `var(--muted-foreground)` renders #616161 on #101011.
   This covers the collapse button (`2BWJ-0`), all ten nav icons (`2BWE-0`,
   `2BW9-0`, `2BW3-0`, `2BVW-0`, `2BVQ-0`, `2BVK-0`, `2BVF-0`, `2BV9-0`,
   `2BV4-0`, `2BUX-0`), the account chevron (`2BUM-0`), the location pin
   (`2BU8-0`), Search (`2BTW-0`), ⋯ (`2BTH-0`), the title tile icon
   (`2BTC-0`), both band icons (`2BT3-0`, `2BRH-0`), the "View all" arrow
   (`2BRM-0`), and the two row tile icons (`2BR1-0`, `2BQQ-0`).
   **Should be #A3A3AA** (dark `--muted-foreground`, `ink-2`).
2. **App — Dark theme (`2BPD-0`). Marks keep the light subtle grey.** Strokes
   that use `var(--subtle-foreground)` render #8A8A8A: the two breadcrumb
   chevrons (`2BUD-0`, `2BU4-0`) and the seven row chevrons (`2BSP-0`,
   `2BSE-0`, `2BS2-0`, `2BRR-0`, `2BR5-0`, `2BQU-0`, `2BQJ-0`). **Should be
   #5C5C63** (dark `--subtle-foreground`, `ink-4`), the value the frame already
   uses for the "/" slashes.
3. **App — Dark theme (`2BPD-0`). Green status keeps the light value.** The
   two booking pies (`2BST-0`, `2BS6-0`) use `var(--success)` = #0D6B4E, which
   is nearly invisible on #101011. **Should be #3DD68C** (`--color-good` dark
   in `tokens.css`).
4. **App — Dark theme (`2BPD-0`). Amber status keeps the light value.** The
   two "Full" dots (`2BSI-0`, `2BRV-0`), the balance-due pie (`2BRC-0`), and
   the "RM 640.00" text (`2BR7-0`) use `var(--warning)` = #9A5B00. **Should be
   #F5A524** (`--color-warning` dark in `tokens.css`).

### Should fix

5. **App — Sidebar with all pages, sidebar `1IXF-0`. The three new labels are
   not exact copies.** The Inbox (`1IZ4-0`), Agents (`1IYY-0`), and Schedule
   (`1IYA-0`) labels lack `display: inline-block` and
   `font-feature-settings: "tnum"`. The other seven labels have both. There is
   no visible change today, but this sidebar will be cloned into every frame.
   **Copy the label style from "Home" (`1IZ9-0`).** Everything else matches
   "Home — Today" (`10HS-0`) value for value: 236px wide, 12px side and bottom
   padding, 48px brand row with 6px left padding and the same mark, 28px
   collapse button, nav 4px top padding and 2px gap, 32px rows with 8px side
   padding and 10px gap, 8px radius, `--accent` selected fill, 16px icons with
   1.5 stroke in `--muted-foreground`, 13px/20px weight 500 labels, and the
   36px account row (22px avatar, 13px name, 12px role, 14px chevron).
6. **App — Sidebar with all pages, Schedule icon (`1IYB-0`). It reads as the
   Programs icon.** Both are the same calendar frame; only the inner mark
   differs (dots or a check). At 16px, in the screenshot and in the collapsed
   rail (`2AEF-0`), the two rows look the same. **Use a clearly different
   glyph for Schedule**, such as a calendar with a clock or a clock. Do this
   before the clone pass, because the icon will spread to every frame.
7. **Card and Stripe in new frames.** The report says new frames show only Cash
   and Bank transfer under "Payments today". Four new frames still show Card
   and Stripe:
   - App — Sidebar with all pages (`1THL-0`): `1THW-0`, `1THT-0`
   - App — Dark theme (`2BPD-0`): `2BPO-0`, `2BPL-0`
   - App — Collapsed sidebar (`2AEF-0`): `2AEQ-0`, `2AEN-0`
   - App — Organization switcher (`214O-0`): `214Z-0`, `214W-0`

   **Make them match the report**, or change the report. The originals
   ("Home — Today", "App — ⌘K command menu", "App — Location switcher") are the
   target and stay as they are; keeping card and online payments is the
   user's decision.
8. **App — ⌘K without members:read (`23XQ-0`). The pages list is cut to four.**
   It shows Home, Inbox, Check-ins, and Schedule. `CommandMenu` does not filter
   pages by permission: it lists all ten sidebar pages, then Settings and
   What's new. Four rows suggest a filter that does not exist. **Show the full
   list**, cut off by the dialog's height if needed. The account row also says
   "Kennedy · Owner", a role that has `members:read`. **Use a role that plausibly
   lacks it**, or no role.
9. **Home — Receptionist (cannot sell) (`1Y5Y-0`). Money still shows.** The
   properties drop Sales, Collected, and Payments today, but Needs attention
   still shows "4 sales with a balance due" and "RM 640.00". Either the role
   sees money or it does not. **Hide the amount, or keep the money properties.**
   This depends on open question 2 in the report.
10. **App — Menus and top bar states (`1RKX-0`). "Create sale" has no key
    hint.** The New sale frame (`OWZ-0`) shows ⌘↵ on Create sale (`PKQ-0`), and
    the app has that shortcut. **Add the ⌘↵ hint** so the sheet matches the
    page it describes.
11. **Coverage: two chrome states have no frame and no reason.** The
    organization route renders a blocked page in two cases: "Staff access is
    turned off" (access unavailable) and "Cannot open “<org>”" (the
    organization did not open, with Sign out). No artboard in the file has
    either text. **Add both as frames**, or name the page that owns them in
    the report.

### Note

12. **Not built yet — Inbox (`27SU-0`). Drop it.** `routes/$org/soon.tsx` only
    redirects old `/soon` links to the real pages. No route renders a "not
    built yet" page, and every sidebar page has a screen. The frame designs a
    state the app cannot reach.
13. **App — Sidebar order.** The order Home, Inbox, Agents, Members, Sales,
    Check-ins, Schedule, Programs, Products, Reports is the better one. Schedule
    is daily desk work like Check-ins, so it belongs with the daily pages; Programs
    and Products are set-up pages that create what the schedule shows, so they
    follow it, and putting Schedule after Programs splits the daily group.
14. **App — Dark theme (`2BPD-0`). Avatar fill.** The avatar uses #26262A (the
    dark line). `tokens.css` gives the dark avatar #3E3E44 and its letter
    #CFCFD3. The letter uses #A3A3AA. Minor, but the avatar nearly merges with
    the surface.
15. **App — Dark theme (`2BPD-0`). Logo tile.** The mark's tile is #0A0A0B on a
    #101011 surface, so the tile edge disappears and only the dots show. This is
    the brand asset; decide whether dark needs a lighter tile.
16. **Home — Load error (`1WPY-0`). Developer wording.** "The Flowfokus API did
    not respond. Check that Rails is running, then try again." is the app's real
    text (`lib/format.ts`), but staff cannot check Rails. Say so as a question
    for the user; do not change the frame alone.
17. **Home — Quiet day (`1ZD5-0`). A hairline with nothing under it.** Payments
    today is hidden, but the "Today" group keeps its bottom hairline. The same
    line shows in every frame that reuses this background (`229B-0`, `23SE-0`,
    `23XQ-0`, `25HH-0`, `25MC-0`). Remove the line when it is the last group.
18. **App — Organization switcher (`214O-0`). The open trigger has a fill.**
    The organization trigger shows a grey fill while open. The original location
    switcher (`17B4-0`) shows no fill on its open trigger. Pick one and use it in
    both.
19. **What's new — Sample data (`27NZ-0`).** The bands' right facts differ in
    kind ("Preview · 21 Oct 2026" and "v0.4 · 21 Oct 2026"). The one-line
    intros under each band ("Explore the next set…", "Clearer navigation…") are
    taglines; the brief cuts these.
20. **Coverage notes, not blockers.** These real states have no frame: ⌘K just
    opened with no query for a role with `members:read` (the app lists all
    pages); the account menu without Sign out (demo mode, `canSignOut` false);
    the collapsed rail's hover tooltip and the expand icon that replaces the
    logo on hover. The phone drawer may live on "Narrow screens"; I did not
    check.
21. **Inherited, not the designer's work.** The ⌘K query text is 14px in the
    original (`17PA-0`) and in the three ⌘K copies (`22M0-0`, `23SS-0`,
    `23Y4-0`). The Products icon's dot has a raw fill #4A4A4A in the original
    (`10ID-0`) and in `1IY0-0`. Leave both for the user.
22. **Layout on the canvas.** Row 3 skips the slot at x 6080 between
    "⌘K without members:read" and "Account menu, Theme". Nothing overlaps.

## Categories with nothing found

- Fidelity: every Home state is "Home — Today" with only the state's changes. The ⌘K states use the original dialog, and the organization switcher uses the location switcher's design. Nothing looks like the current Overview.
- Visual quality: no clipping, overflow, or overlap. Text sizes are 20, 13, and 12px, apart from the inherited 14px ⌘K query. Figtree only. No raw hex outside the dark frame, apart from the inherited ones in finding 21. Menus and dialogs sit inside the window, and toasts sit at bottom centre, as in `TWC-0`.
- Top bar: the four cases follow the rule (Search, the page's actions, then ⋯ only with more), apart from the missing key hint in finding 10.
- Words: no "Deliver". Home, Check-ins, and Products are used throughout.

## Verdict

The sidebar is not ready to clone yet, but it is close. Its layout values match
"Home — Today" exactly. Two small fixes are needed first: copy the label style
onto Inbox, Agents, and Schedule (finding 5), and give Schedule an icon that
does not read as Programs (finding 6). After those, clone `1IXF-0` as it is.
The set is ready to build from once the dark frame uses the dark icon and
status values (findings 1–4) and the Card and Stripe rows are settled
(finding 7). The other findings are small and can be fixed in the same pass.

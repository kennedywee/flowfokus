# Programs review

Reviewer: design review agent. Read-only review of the 17 new artboards on
Programs (`p-9-0`), Program details (`p-A-0`), and New program (`p-B-0`).
Booking rules & settings (`p-C-0`) has no new artboards. The standard is
`docs/paper-redesign/brief.md`.

Overall, the frames are true clones. The window, sidebar, top bar, columns,
row style, and tokens match the originals. The artboards do not overlap, and
they sit on the 80px grid. The problems are in a few states, the error
wording, and the confirm dialog style.

## Findings

### Must fix

1. **Program details · "Program details — No sessions, no ticket prices" (`1YSZ-0`)**
   - What is wrong: Sell ticket is gone because there is nothing to sell. Book member stays in the top bar, but a booking needs a session, and this program has none.
   - What it should be: Remove Book member, as Sell ticket was removed. The top bar then has Search, Add sessions, and ⋯.
   - Severity: must fix.

2. **Program details · "Program details — Sessions added (toast)" (`28HV-0`)**
   - What is wrong: The toast says "4 sessions added", but the page has not changed. The Sessions band still says 20, and the activity feed has no "added 4 sessions" event. The frame shows a state that cannot happen.
   - What it should be: Show the result. Set the band count to 24 and put "Kennedy added 4 sessions · Just now" at the top of the feed. Keep the toast in the "Sale details" toast style (`TWC-0`).
   - Severity: must fix.

3. **Program details · "Program details — Archive price" (`24G9-0`)**
   - What is wrong: The dialog uses the full dialog style: a header band with the title and a close button, a body, and a footer. The confirm reference, "New sale — Discard" (`TP2-0`), is different. Its title and sentence are in one body block, it has no close button, and the footer has the two buttons. The confirm is also 480px wide, but the reference is 440px.
   - What it should be: Clone `TP2-0`. Title "Archive Member guest?", then the sentence "It can never go back on sale. Past sales keep this price.", then Cancel and the red "Archive price" button.
   - Severity: must fix (it is a second dialog style for the same job).

### Should fix

4. **Programs · "Programs — No results" (`1VFC-0`)**
   - What is wrong: The 40px search tile above the line is missing. The search field also lost its "/" key hint when it holds text.
   - What it should be: Match "Sales — list · no results" (`UQH-0`). Add the muted 40px tile with the search icon, and keep "/" in the field.
   - Severity: should fix.

5. **All error states: Programs — Did not load (`1V4M-0`), Program details — Did not load (`287S-0`), Program details — Add sessions, not added (`24RU-0`), New program — Not saved (`2962-0`)**
   - What is wrong: The message reads "The Flowfokus API did not respond. Check that Rails is running, then try again." Front desk staff do not know what "API" or "Rails" means, and they cannot check it.
   - What it should be: Use a staff sentence that says what to do next, for example "Flowfokus did not respond. Try again in a moment." Keep "Your details are kept." on the New program notice. If the developer message is needed in local work only, record that in the report.
   - Severity: should fix.

6. **Program details · "Program details — Ticket price menu" (`1Z32-0`)**
   - What is wrong: (a) The menu covers the "Early bird · Archived" row, so the archived state cannot be seen. The report names it as a drawn state. (b) "Not on sale" and "Archived" are grey text with no status mark. The brief says that a status is a 16px icon with grey text, and the "Ended" row on the same frame has one.
   - What it should be: (a) Open the menu on a row so that it does not hide Early bird, or draw Early bird again in "Program details — without programs:manage" or a new frame. (b) Give "Not on sale" and "Archived" a 16px grey icon, in the same style as the session status marks.
   - Severity: should fix.

7. **Program details · "Program details — No sessions, no ticket prices" (`1YSZ-0`)**
   - What is wrong: An "Add sessions" button sits under "No coming sessions". The same action is already in the top bar. The original empty state, "Programs — No programs yet" (`16TA-0`), has no button, because New program is in the top bar.
   - What it should be: Remove the inline button and keep the line "No coming sessions", as `16TA-0` does.
   - Severity: should fix.

8. **New program · "New program — Spots out of range" (`29LU-0`)**
   - What is wrong: The message "From 1 to 10000" does not tell the user what to do. The original errors on this page are instructions: "Enter a name" and "Pick at least one day" ("New program — 6 · Missing details", `X7E-0`).
   - What it should be: "Enter 1 to 10,000 spots." Use a thousands separator.
   - Severity: should fix.

9. **Program details · "Program details — New ticket, invalid" (`244Y-0`)**
   - What is wrong: The Price error wraps to two lines in the 180px column ("Enter an amount, for example / 25 or 25.50."). The text goes past the field width and pushes Covers down.
   - What it should be: Use a shorter message, such as "Enter an amount, like 25.50." Keep it on one line.
   - Severity: should fix.

10. **Report · "Program page loading" ("not designed")**
    - What is wrong: The report says "use the list skeleton under the page head". But the program page head (name, weekly pattern) and the properties column are loaded data too. The app's pending view (`routes/$org/programs/$programId.tsx:22`) is eight skeleton rows with no head. A builder cannot tell what stays visible: the breadcrumb page name, the top bar actions, the tile, or the properties.
    - What it should be: Draw "Program details — Loading" as a clone of `G2Q-0`. Put skeleton bars in the title, subtitle, session rows, and properties. Show the top bar without actions, as in "Program details — Not found" (`27XP-0`). Or write these rules in the report exactly.
    - Severity: should fix.

11. **Report · coverage table gap**
    - What is wrong: The New ticket dialog has a server failure, "The ticket price was not added" (`ProgramDialogs.tsx:330`). It is not in the table and not drawn.
    - What it should be: Add a row. "Program details — Add sessions, not added" (`24RU-0`) shows the same notice style, so the row can point to that frame, with a new title.
    - Severity: should fix.

### Notes

12. **Programs · "Programs — without programs:manage" (`1UJ6-0`) and "Programs — No programs yet, without programs:manage" (`1YDE-0`)**: the ⋯ button stays. The brief says to show ⋯ only when there are more actions. Confirm what the list ⋯ holds for Front desk. If it only holds manage actions, remove it.
13. **Programs · "Programs — No programs yet, without programs:manage" (`1YDE-0`)**: the second line, "A manager adds programs.", is helper text. It is useful because there is no action, so keep it. The empty-state rule is "one plain line and one action".
14. **Program details · "Program details — New ticket, invalid" (`244Y-0`)**: the cloned dialog carries "All sessions" and "Pack" under Covers. These options are the conflict that the report names (see "The report's claims"). The frame is faithful to the original, but the user's answer to that open question will change this frame too.
15. **Add sessions, not added (`24RU-0`) and New program — Not saved (`2962-0`)**: they add a bordered notice box with an icon. No reference frame has a form-level notice. The two frames use the same notice, which is good. Record it as a new pattern in the report, so that other pages reuse it.
16. **New program — Spots out of range (`29LU-0`)**: the error has a small icon, which follows the brief and "New sale — error" (`TIQ-0`). The page's own original (`X7E-0`) has red text with no icon. The two styles now sit on the same page. The user should pick one.
17. **Report · "Edit failed or saving"**: "Edit program — host changed" (`145T-0`) has only Details, so a builder can apply the `2962-0` notice and the `29DY-0` dimmed button with "Saving…". This is buildable. Add the edit notice title ("The changes were not saved") to the report.
18. **Pending labels**: "Archiving…" (archive confirm) and "Adding…" (Add sessions, New ticket) are not listed. A builder can derive them from "New program — Creating" (`29DY-0`). Name them in the report.
19. **Raw colors**: the only hex values on these pages are the key-hint colors in dark buttons (`#FFFFFFB3`, `#FFFFFF99`). They come from the original frames, not from this work.

## Categories with no findings

- Top bar order: Search, then page actions, then ⋯ is correct on every new frame. The role without programs:manage has no manage actions on the program page.
- Words: no "Deliver", no "time" for a session, and "New program" is used. Toasts use "session".
- Font and sizes: only Figtree (`--font-sans`), and only 20, 13, and 12px text in the new content.
- Artboard placement: no overlaps. Rows are 80px apart on the grid. Nothing is clipped at an artboard edge.
- Dialogs and menus: they are centred on the window, inside its edge, and over the dimmed page.

## The report's claims

The conflict is real. `docs/models.md` says that a ticket "buys one spot at
one time", and that a ticket sale names its occurrence. The app's ticket
dialog says the same thing ("One ticket, one spot", `ProgramDialogs.tsx:354`).
A ticket line can buy up to ten spots, but they are all at one time.
"All sessions", "Pack · A set number", and "Full course · All 12 sessions"
cover several sessions, so they break the rule. They appear in "New program —
5 · Add ticket" (`WY5-0`), "Exploration — Tickets in main content" (`MG5-0`),
and now in the new `244Y-0`.

## Verdict

This set is almost ready to build from. The list states, the permission
branches, the not-found state, and the New program states read as states of
the user's design, and a builder can use them as they are. Fix the three
must-fix items before building the program page: Book member with no
sessions, the toast frame that does not show its result, and the second
confirm dialog style. Rewrite the developer-facing error message on the four
error frames. Then draw the program page loading state, or define it exactly.
The rest are small polish items and report updates.

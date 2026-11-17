# Schedule and session — design review

Reviewed: the 7 new frames on "Schedule" (`p-V-0`) and the 9 new frames on
"Session details" (`p-D-0`). I compared them with the user's originals and the
reference frames. I also checked them against `schedule/index.tsx` and
`schedule/$occurrenceId.tsx`. This review is read-only. I changed nothing in
Paper.

## Must fix

1. **Schedule — Earlier weeks (1D9S-0).** "Cancelled · Deepavali holiday"
   wraps to two lines. The status lane is 180px wide (node 1C2R-0 pattern), so
   a longer reason breaks the row height. Should be: one line, like every other
   row. Truncate the reason with an ellipsis, or widen the lane. Check that
   every row in "Two weeks" (19OX-0) still lines up afterwards.

2. **Session details — Full, held for online payment (1TOL-0).** The floating
   bulk bar ("2 selected · Check in · No-show") covers the Daniel Wong comment.
   "Show 11 earlier events" sits on the window's bottom edge. Should be: the bar
   floats over empty space, as in the user's frame (KSY-0). Make the artboard
   taller (fit-content) or show one fewer row.

3. **Session details — Full, held for online payment (1TOL-0), Mei Ling Tan
   row.** The held booking has a live checkbox and a "Not marked" attendance
   mark, so it can be bulk checked in. In the app a held booking cannot be
   marked present or cancelled (`BookingActions` returns nothing for `held`).
   Should be: no checkbox and no attendance action on a held row. Leave the
   checkbox slot empty so the lanes stay aligned.

4. **Session details — View only (253F-0).** The checkbox slot was removed,
   so the attendance icons and avatars moved 24px left. The band icons ("Not
   marked", "Checked in") did not move. The row icons now sit at x≈302 and the
   band icons at x≈326. Should be: one lane for the band icon and the row icon,
   as in KSY-0. Keep the 24px slot empty, or move the band icons too.

5. **Session details — Cancelled session (1VQE-0), Activity.** The feed puts
   "Kennedy cancelled this session · Today 05:40" above "Daniel Wong · Today
   06:35". Newest must come first. The cancel at 05:40 also comes before the
   coach's 06:35 note about collecting the drop-in, which then makes no sense.
   Should be: cancel time after the last event, at the top.

6. **Session details — Dialogs, menus and toasts (1Q70-0), Book member.** The
   five Book member states have no footer. Actions sit as Book/Sell buttons on
   each row. The brief's dialog has a footer under a hairline with Cancel and
   the action, as in "Add products" (P6M-0). Should be: keep the per-row
   choice if needed, but add the footer (Cancel, or Close), or state in the
   report why this dialog differs.

## Should fix

7. **Session details — Cancelled session (1VQE-0), row chips.** "Credit
   returned" replaces the "booked with" chip, so the row no longer says which
   pass or membership was used. Jason Teo and Priya Nair hold "Monthly
   unlimited", which has no credits. The app says "each use was returned".
   Should be: keep the original chip (for example "10-class pass") and say
   "Use returned" in grey after the name, or use "Use returned" in the chip.

8. **Session details — Cancelled session (1VQE-0), reason.** The cancel reason
   shows only in the activity feed, which folds older events. The app shows the
   reason on the page. Should be: put it in the Status property, "Cancelled ·
   Coach unwell", the same as the Schedule row (19OX-0).

9. **Session details — Dialogs (1Q70-0), "already has a spot" and "Not
   booked".** Both use a bordered box with an icon. The brief allows no cards,
   and the error pattern elsewhere is a 12px line with a small icon (see the
   reason errors in 23EX-0 and 1TH0-0). Should be: a 12px message under the
   Member field. Also reword "Nurul Huda already has a spot here: booked." to
   "Nurul Huda is already booked."

10. **Session details — Dialogs (1Q70-0), presentation.** Every Book member
    state sits on bare canvas. None is shown over the dimmed session page. The
    references (P6M-0, TP2-0, 157N-0) show the dialog over the page. Should
    be: draw at least step 2 over the dimmed session page, like P6M-0.

11. **Empty states differ inside the set.** "No sessions match" (1DH4-0),
    "Nothing scheduled" (1DOG-0) and both "Did not load" frames use a 40px
    icon tile above the line. "No bookings" (1ZI0-0) has no tile. Should be:
    one pattern. Follow the Sales no-results frame (UQH-0), which has the tile.

12. **Status words differ between the list and the session.** The Schedule row
    says "Full" and "Ended · 11 of 12 booked". The session Status property says
    "Full · 12 of 12" and "Ended". Should be: the same words in both places.
    I suggest "Full" and "Ended" on the session (Capacity already gives 12),
    or the counts in both.

13. **Schedule — Filter by program (1D2G-0).** The menu's left column has
    empty space under "Program", and it has no "Filter…" field. Sales (U3Z-0)
    has the field and a left column sized to its items. Should be: copy U3Z-0.
    Keep the field if more filters may come; otherwise size the column to its
    one item.

14. **Error words.** "The Flowfokus API did not respond. Check that Rails is
    running, then try again." (1E34-0) and the toast "Not checked in · The
    Flowfokus API did not respond" (1Q70-0) are developer words. Staff cannot
    act on "Rails". Should be: "Flowfokus did not respond. Try again." The app's
    `lib/format.ts` line has the same problem, so list it under app work.

15. **Session details — Full (1TOL-0), payment wording.** The chip says
    "Awaiting online payment". Sales (LYF-0) says "Awaiting payment" for the
    same fact. Should be: "Awaiting payment", or keep "online" only if the user
    wants to tell gym-site holds apart. Put it in the open questions.

16. **Session details — Loading (1ZQ8-0).** The breadcrumb already shows "Thu 5
    Nov, 07:00" while the page has not loaded. The title and Details column are
    missing. Should be: a skeleton for the title and Details too, and a neutral
    last crumb, as in "Did not load" (1ZYG-0).

## Notes

17. **Cancel session (157N-0 original vs 23EX-0).** Rails requires a reason.
    The user's dialog has no Reason field; the new error frame adds one. So the
    set has two versions of one dialog. No frame shows the field filled. Ask the
    user to approve the field, then add a "reason filled" state.

18. **Group ticket (1Q70-0).** "3 × RM 35.00 = RM 105.00" sells three spots in
    one sale. The brief says "A sale has one line, quantity one". The app does
    send `quantity` and `attendees`, so the frame is right for the app. The
    report should list this under Conflicts or Open questions.

19. **Session details — View only (253F-0).** The Cancelled group from KSY-0
    is gone, and the feed says "Kennedy added 8 sessions" although two members
    are checked in. Keep the sample data the same as KSY-0, so the frame shows
    only the permission change.

20. **Session details — Did not load (1ZYG-0).** One frame covers both
    "not found" and "did not load". The not-found text is fine. A network error
    would need "Try again", as on Schedule (1E34-0). Consider a second line of
    copy in the report, not a new frame.

21. **Sample text.** "Session cancelled · 11 bookings cancelled, credits
    returned" — drop-ins get no credit. "11 earlier events" is shown on frames
    with different histories. Small; fix when touching the frames.

## Coverage gaps (real states with no frame and no stated reason)

I checked the five states most likely to be missed:

- Ticket for several attendees and guests: covered (1Q70-0).
- Undo attendance: covered by the user's attendance menu (LKE-0).
- Role without `programs:manage`: **partly**. "View only" removes everything.
  A desk role that can book but not cancel the session is not shown. Its ⋯
  menu would hold only "Open program". A one-line note in the report is
  enough.
- Not-found page: covered (1ZYG-0), see note 20.
- A booking cancelled by staff: **missing**. The Cancelled group is shown only
  for a cancelled session ("Session cancelled" on every row). No frame shows an
  open session with one staff-cancelled booking and its reason. The app shows
  `cancel_reason` on that row.

Other real states with no frame:

- **"Hold expired" booking** (`BOOKING_STATUS_LABEL.expired`). It goes into
  the Cancelled group in the app. No frame or reason.
- **"Their passes did not load"** and the passes loading state in Book member.
- **"The ticket sale was not recorded"** error in Book member. Only "Not
  booked" is drawn.
- **Book-only and sell-only roles** (`bookings:create` without
  `purchases:create`, and the reverse). The dialog loses one half. A note is
  enough.

## Categories with no findings

- Top bar: Search then Programs on Schedule, Search, Book member, ⋯ on the
  session. 28px buttons. Breadcrumbs name the right page.
- Fonts and colours: Figtree only; no new raw hex. The only hex values are
  the canvas, shadow, and logo values cloned from the originals.
- Text sizes: only 20, 13 and 12px found.
- Fulfill words: no "Deliver" anywhere; "fulfill" is used in the ticket toast.
- "Session" wording: new frames say "session". "Time" appears only as the
  property label from the user's frame.
- Sidebar item: the Schedule item matches Programs exactly. It has a 32px row,
  8px radius, 16px icon with a 10px gap, 13px/500 label, and `--accent` fill when
  selected. The only difference is the missing "tnum" on the label, which has
  no visible effect.
- Schedule rows follow Home "Up next" (10C8-0): the same 14px status icons,
  the same grey second line, and a chevron lane.

## Verdict

The Schedule page is nearly ready to build from. It reads as part of the same
app as Home and Sales. Fix the wrapping status (1) and align the filter menu
with Sales (13). The session set is close but not ready. The held row (3), the
view-only lane shift (4), and the Book member dialog without a footer (6)
would be built wrong as drawn. The overlap (2) and the activity order (5) are
quick fixes. Add the staff-cancelled booking and the "Hold expired" state, then
the set covers the app.

# Check-ins — Paper report

Page: "Check-ins" (`p-J-0`) in "Flowfokus Redesign". The six original frames
(1–6) are the target design. I did not change them. I added 25 frames, numbered
7–31 in flow order, in three rows below the originals. Every new frame is a
clone of an original (or of the Member details frame) with only the state
changed.

Sources read: `routes/$org/check-in.tsx`, `features/check-ins/CheckIns.tsx`,
`components/CheckInPanel.tsx`, the check-in dialog in
`features/members/MemberDetails.tsx`, `lib/staff.functions.ts`, `lib/format.ts`,
`packages/api/src/schema.d.ts`, and the Rails `Staff::CheckInsController` and
`CheckIn` model.

## 1. Coverage

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| Visit list | 1 · Today | existed |
| No check-ins | 6 · No check-ins yet | existed |
| Check in: choose the member | 2 · Find member | existed |
| Search pending | 7 · Find member · Searching | added |
| No member matches | 8 · Find member · No match | added |
| Member list failed to load | 9 · Find member · Search failed | added |
| Organization has no location | 10 · Find member · No location | added |
| Location choice | — | not designed: the top bar location is used |
| Granted, unlimited access | 3 · Checked in | existed |
| Granted, a credit used | 11 · Checked in · Credit used | added |
| Check-in request failed | 12 · Check-in not recorded | added |
| Denied: no active membership right | 4 · Denied; 13 · Denied · No membership right | existed; added (13 adds the override link) |
| Denied: not valid at this location | 14 · Denied · Not valid here | added |
| Denied: no visits left this period | 15 · Denied · No visits left | added |
| No right, sale not paid (Record a payment) | 16 · Denied · Sale awaiting payment | added |
| No right, paid sale not fulfilled (Fulfill a paid sale) | 17 · Denied · Sale not fulfilled | added |
| Let in anyway, reason field (`check_ins:override`) | 18 · Let in anyway | added |
| Let in anyway, reason missing | 19 · Let in anyway · No reason | added |
| Let in by staff, result | 20 · Let in by staff | added |
| Denial for a role without `check_ins:override` | 21 · Denied · No override permission | added |
| Check in from the member page, granted | 22 · Member page · Checked in | added |
| Check in from the member page, denied | 23 · Member page · Denied | added |
| Filter visits by result | 24 · Filter by result; 25 · Filtered · Denied | added |
| Filter with no results | 26 · Filter · No results | added |
| Export visits | 27 · More · Export visits | added |
| List loading | 28 · Loading | added |
| List failed to load | 29 · Did not load | added |
| Role can see visits but cannot check in (no `check_ins:create`) | 30 · Cannot check in | added |
| Role cannot see visits (no `check_ins:read`) | 31 · No permission | added |
| Undo a check-in | 5 · Check-in undone | existed (Rails cannot undo yet, see section 4) |
| Choose which access right to use | — | not designed: Rails picks the right; the original flow has no choice |

## 2. Added

- **7 · Find member · Searching.** The original search with a "Searching
  members…" row.
- **8 · Find member · No match.** "No members match "kenji"" and New member.
- **9 · Find member · Search failed.** "Search didn't load. Check the
  connection, then try again."
- **10 · Find member · No location.** The search over the frame 6 empty
  state. The top bar says "No location". The search shows "Chainsaw Gym has
  no location" and Add location.
- **11 · Checked in · Credit used.** The original toast: "Mei Ling Tan checked
  in · 1 credit used", Undo. The new row sits above the seven original rows;
  the footer reads 87.
- **12 · Check-in not recorded.** The toast in an error tone: "Mei Ling Tan was
  not checked in. Try again." Mei Ling has no row today.
- **13 · Denied · No membership right.** Original frame 4, plus a quiet "Let
  in anyway…" at the left of the footer (owner role), drawn with its hover
  fill.
- **14 · Denied · Not valid here.** "Aisha Tan can't check in", "Access ·
  Monthly unlimited · Mont Kiara only". No main button: Close and Let in
  anyway…. The list shows her 07:58 denied row.
- **15 · Denied · No visits left.** "Aisyah Rahman can't check in", "Access ·
  10-class pass · 0 of 10 credits left", main button Renew. The list shows
  her 07:58 row "Denied · No credits left".
- **16 · Denied · Sale awaiting payment.** Priyanka Das. "Monthly unlimited ·
  not paid yet", "Balance · RM 220.00 due", the line "Access starts when the
  sale is fulfilled." Buttons: Fulfill early, Record payment (main).
- **17 · Denied · Sale not fulfilled.** Kevin Ong. "Monthly unlimited · paid,
  unfulfilled", main action Fulfill sale. Frames 14–17 show the denied
  attempt as the top row; footer "87 check-ins today · 4 denied".
- **18 · Let in anyway.** The same dialog. "Why let Farah in?" text area with a
  reason and the line "Saved on Farah's check-in. Nothing is used." Footer:
  Cancel, Let in Farah.
- **19 · Let in anyway · No reason.** Red field and "Enter a reason. It stays
  on the record."
- **20 · Let in by staff.** Toast "Farah Aziz let in by staff", Undo. A new
  07:52 row "Checked in · Let in by staff" sits above the seven original rows.
- **21 · Denied · No override permission.** Frame 13 without "Let in anyway…";
  the account shows "Front desk".
- **22 · Member page · Checked in.** Member details. Check in (C) in the top
  bar checks Priya in at the top bar location. The original toast: "Priya Nair
  checked in", Undo. Activity gains the 18:20 check-in; Visits reads 128.
- **23 · Member page · Denied.** Top bar location Petaling Jaya. The original
  denial dialog over Member details: "Monthly unlimited · Bangsar only",
  Close and Let in anyway…, no main button. Activity shows "Denied at
  Petaling Jaya · Not valid here".
- **24 · Filter by result.** The original Filter button opens the Sales-style
  menu: Result and Access on the left; Checked in (83) and Denied (3) with
  checkboxes on the right. The "Result is Denied" chip sits beside Filter.
- **25 · Filtered · Denied.** The chip, three denied rows, footer "3 denied
  today", matching the menu count.
- **26 · Filter · No results.** The chip and a search for "kenji". One line,
  "No denied check-ins match "kenji"", and Clear filters. No icon tile.
- **27 · More · Export visits.** The ⋯ button open, with "Export visits as
  CSV".
- **28 · Loading.** The original header band with skeleton rows.
- **29 · Did not load.** "Check-ins didn't load. Something went wrong on our
  side. Try again in a moment." and Try again. No icon tile.
- **30 · Cannot check in.** The original list without the Check in button.
  The account shows "Viewer".
- **31 · No permission.** Title only, no actions. "Your role can't see
  check-ins. Ask an owner for check-in access (check_ins:read)." No icon
  tile. The account shows "Coach".

## 3. Conflicts

Only items that cannot be true under the business rules.

- **"Walk-in"** (frames 1–5, Narrow screens). A check-in belongs to a member.
  Rails rejects a check-in without one, and `docs/models.md` calls a check-in
  "an access attempt by a member". Guests exist only on bookings.
- **"Morning strength · Booked" as gym access** (frames 1–5). Check-in reads
  gym-access rights only ("Only `gym_access` rights open the gym floor"). A
  booking uses a program right, so it cannot be the access of a check-in.

"Outside access hours" is not a conflict. Nothing in the rules forbids access
hours; Rails just has no time window yet. It is on the build list below.

## 4. Needs app or Rails work

The build list. Paper shows these and the app or Rails cannot do them yet.

- **Access hours** ("Denied · Outside access hours", frames 1–5). Needs a time
  window on gym-access rights and a fourth denial reason in Rails.
- **Access column.** The name of the right used, "6 credits left", and "No
  active access". The check-in response has only `entitlement_id`.
- **Credits used.** "Checked in · 1 credit used" in the row and the toast.
- **Denial words in the row** ("Denied · Access ended 3 Nov", "Denied · Sale
  awaiting payment"). The app shows one generic title per reason.
- **The cause behind "no active membership right"** (frames 4, 13, 16, 17).
  Rails returns the same reason (`no_entitlement`) for no access, access
  ended, a sale awaiting payment, and a paid sale not fulfilled. To show these
  cases, the app must load the member's open sales with the denial, or Rails
  must return the cause. The "Balance" row needs the member's balance too.
- **The next step per denial.** 13: New sale. 14 and 23: no main step. 15:
  Renew (Rails renewal terms, as on the member page). 16: Record payment, plus
  Fulfill early for roles with `purchases:fulfill_unpaid`. 17: Fulfill sale.
  Each button appears only for a role with the matching sales permission.
- **Undo** (frames 3, 5, 11, 20, 22). Rails has only list and create. There is
  no delete or reversal, and a granted check-in records a usage.
- **Toast result.** The app shows the result in a panel, not a toast. The
  toast needs an error variant (frame 12) and Try again.
- **Check-in from the top bar search.** The app uses a form with a member field
  and Check in button. Paper checks in on choosing a member.
- **Member search with numbers, phones, and access status** (frame 2). Members
  have no number or phone. The search does not return access.
- **Server search.** The app loads every member in the route and filters in the
  browser, so "Searching…" (7) and "Search didn't load" (9) need a search
  endpoint.
- **Search members** on the list (`/` field), **Display**, and the **Filter**
  menu with counts and the Access filter.
- **Row detail.** Rows end in a chevron. There is no check-in detail page.
- **Daily count** ("86 check-ins today · 3 denied"). Rails returns the latest
  100 check-ins, not today's count.
- **Export visits in ⋯.** The app has an Export visits button; it moves into
  the ⋯ menu.
- **Override in the dialog.** The app has Let in anyway in the panel. The
  dialog link, the reason line, and the button "Let in Farah" are new. The
  app's override button is red (`variant="destructive"`); change it to the
  neutral primary button. Letting a member in loses nothing.
- **Check in (C) on the member page checks in directly** at the top bar
  location, with the toast or the denial dialog. The app opens a dialog with a
  location choice.
- **No location in the search** (frame 10). "Add location" needs a link to
  settings.
- **Loading skeleton** (28) and **Try again** (29). The route loads before
  render.
- **Error copy.** The app's messages name the API, Rails, or the database
  ("The Flowfokus API did not respond. Check that Rails is running"). Frames
  9, 12, and 29 use staff words instead.
- **Permission branches.** The app does not hide Check in or the page by
  permission; it shows the API error. Frames 21, 30, and 31 need the app to
  read `check_ins:create`, `check_ins:override`, and `check_ins:read`.

## 5. Open questions

- **Off-peak hours.** Are access hours part of the product? The "Off-peak"
  product and "Outside access hours" in the originals suggest yes. If so,
  Rails needs a time window and a fourth denial reason.
- **Role names.** Frames 21, 30, and 31 show "Front desk", "Viewer", and
  "Coach" as sample role names. The app knows permissions, not these names.
- **`check_ins:create` without `check_ins:read`.** Frame 31 hides Check in. If
  a role can check members in but cannot see visits, should Check in stay in
  the top bar?
- **Undo for a staff override** (frame 20). Should "Let in by staff" offer
  Undo like a normal check-in?

## 6. Not verified

- I did not run the app or open a browser. All states come from code.
- Phone and tablet frames on "Narrow screens" (19A2-0, 19F1-0) were not
  extended; that page is out of scope. They share the conflicts in section 3.
- Frame 20 shows Farah let in at 07:52 after her 07:18 denial; it assumes she
  came back later.
- Frame 17 uses Kevin Ong. On the Sales page his unfulfilled sale is "Fitness
  assessment", not Monthly unlimited. Accepted as sample data.
- Dark mode was not reviewed.

## 7. Review fixes

From `docs/paper-redesign/reviews/check-ins.md`.

1. 23 two-location right: fixed. "Monthly unlimited · Bangsar only".
2. 11 and 20 lost a row: fixed. The new row sits above all seven original rows.
3. 25 count mismatch: fixed. Three denied rows, matching the menu (3) and the
   footer.
4. 14–17 no denied row: fixed. Each shows the attempt as the top row; footer
   "87 check-ins today · 4 denied". 14 and 15 now use members with no other row
   (Aisha Tan, Aisyah Rahman); Sara Lee's row stays as drawn.
5. 14 and 23 New sale: fixed. No main button; Close and Let in anyway….
6. 15 New sale: fixed. "Renew".
7. 16 Record payment alone: fixed. Record payment (main), Fulfill early, and
   "Access starts when the sale is fulfilled."
8. 18 reason not said to be saved: fixed. "Saved on Farah's check-in. Nothing
   is used."
9. 10 list behind with check-ins: fixed. The search now sits over the frame 6
   empty state.
10. 12 failed attempt for Priya: fixed. Uses Mei Ling Tan, who has no row.
11. Override button and link: kept the neutral "Let in Farah"; drew the hover
    fill on the link in frame 13; the red app button is on the build list.
12. 16 and 17 same Rails reason: kept both frames; on the build list as a
    derived case.
13. 17 Kevin Ong's sale: not fixed. Accepted as sample data (section 6).
14. 27 "CSV" in the hint slot: fixed. "Export visits as CSV", no hint.
15. 31 tile position: fixed by removing the tile (empty states have no tile).
16. Artboard spacing: fixed. Rows sit 80px apart.
17. Inherited values: not changed, as the review advised.
18. 9 shortened message: changed to staff words with no API mention, per the
    brief's error-text check.

Also from the brief's checks: removed icon tiles from the empty and error
states in 26, 29, and 31; frame 22 now shows the new activity event and
Visits 128.

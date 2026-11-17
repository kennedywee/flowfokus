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
- **9 · Find member · Search failed.** "Search didn't load" with the API
  message.
- **10 · Find member · No location.** The top bar says "No location". The
  search shows "Chainsaw Gym has no location" and Add location.
- **11 · Checked in · Credit used.** The original toast: "Mei Ling Tan checked
  in · 1 credit used", Undo. The new row is at the top of the list.
- **12 · Check-in not recorded.** The toast in an error tone: "Priya Nair was
  not checked in. The Flowfokus API did not respond." and Try again.
- **13 · Denied · No membership right.** Original frame 4, plus a quiet "Let
  in anyway…" at the left of the footer (owner role).
- **14 · Denied · Not valid here.** "Ahmad Faiz can't check in", "Access ·
  Monthly unlimited · Mont Kiara only", New sale.
- **15 · Denied · No visits left.** "Sara Lee can't check in", "Access ·
  Off-peak · 8 of 8 visits used this period", New sale (renewal).
- **16 · Denied · Sale awaiting payment.** "Monthly unlimited · not paid yet",
  "Balance · RM 220.00 due", main action Record payment.
- **17 · Denied · Sale not fulfilled.** "Monthly unlimited · paid,
  unfulfilled", main action Fulfill sale.
- **18 · Let in anyway.** The same dialog. "Why let Farah in?" text area with a
  reason. Footer: Cancel, Let in Farah.
- **19 · Let in anyway · No reason.** Red field and "Enter a reason. It stays
  on the record."
- **20 · Let in by staff.** Toast "Farah Aziz let in by staff", Undo. The top
  row reads "Checked in · Let in by staff" with "No active access".
- **21 · Denied · No override permission.** Frame 13 without "Let in anyway…";
  the account shows "Front desk".
- **22 · Member page · Checked in.** Member details. Check in (C) in the top
  bar checks Priya in at the top bar location. The original toast: "Priya Nair
  checked in", Undo.
- **23 · Member page · Denied.** Top bar location Petaling Jaya. The original
  denial dialog over Member details: "Monthly unlimited · Bangsar and Mont
  Kiara only", New sale, Let in anyway….
- **24 · Filter by result.** The original Filter button opens the Sales-style
  menu: Result and Access on the left; Checked in (83) and Denied (3) with
  checkboxes on the right. The "Result is Denied" chip sits beside Filter.
- **25 · Filtered · Denied.** The chip, only denied rows, footer "3 denied
  today".
- **26 · Filter · No results.** The chip and a search for "kenji". "No denied
  check-ins match "kenji"" and Clear filters, as in Sales no results.
- **27 · More · Export visits.** The ⋯ button open, with "Export visits · CSV".
- **28 · Loading.** The original header band with skeleton rows.
- **29 · Did not load.** "Check-ins didn't load", the API message, Try again.
- **30 · Cannot check in.** The original list without the Check in button.
  The account shows "Viewer".
- **31 · No permission.** Title only, no actions. "Your role can't see
  check-ins. It needs the check_ins:read permission." The account shows
  "Coach".

## 3. Conflicts

Only items that cannot be true under the business rules.

- **"Denied · Outside access hours"** (frames 1, 2–5, Narrow screens). Rails
  has no time-of-day rule for access. The only denial reasons are: no active
  membership right, not valid at this location, and no visits left this
  period. Frames 1–5 use it for Sara Lee; frame 15 shows the real reason for
  her ("8 of 8 visits used this period").
- **"Walk-in"** (frames 1, 2–5, Narrow screens). Every check-in needs a
  member (`member_id` is required, and Rails rejects an unknown member).
- **"Morning strength · Booked" as gym access** (frames 1, 2–5). Check-in only
  uses gym-access rights. Program rights are used by bookings, not by
  check-in.
- **"Access ended 3 Nov"** (frames 1–5) is a fair way to say "no active
  membership right". It is not a conflict. Noted only because the rule's
  name is broader: it also covers a member who never had a right.

## 4. Needs app or Rails work

The build list. Paper shows these and the app or Rails cannot do them yet.

- **Access column.** The name of the right used, "6 credits left", and "No
  active access". The check-in response has only `entitlement_id`.
- **Credits used.** "Checked in · 1 credit used" in the row and the toast.
- **Denial reason words in the row** ("Denied · Access ended 3 Nov"). The app
  shows a generic title per reason; the date and right name need data.
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
  endpoint. Today the failure is the member list load.
- **Search members** on the list (`/` field), **Display**, and the **Filter**
  menu with counts and the Access filter.
- **Row detail.** Rows end in a chevron. There is no check-in detail page.
- **Daily count** ("86 check-ins today · 3 denied"). Rails returns the latest
  100 check-ins, not today's count.
- **Export visits in ⋯.** The app has an Export visits button. It exports the
  visible rows.
- **Denial dialog facts.** "Balance" and the main action per case (New sale,
  Record payment, Fulfill sale) need the member's balance and sales at
  check-in time. The app links to the sales list instead.
- **Override in the dialog.** The app has Let in anyway in the panel; the
  dialog placement, the button "Let in Farah", and the reason label are new.
- **Check in (C) on the member page checks in directly.** The app opens a
  dialog with a location choice and a Check in button.
- **No location in the search** (frame 10). The app shows a warning in the
  panel; "Add location" needs a link to settings.
- **Loading skeleton** (28) and **Try again** (29). The route loads before
  render and shows the API error only.
- **Permission branches.** The app does not hide Check in or the page by
  permission; it shows the API error. Frames 21, 30, and 31 need the app to
  read `check_ins:create`, `check_ins:override`, and `check_ins:read`.

## 5. Open questions

- **Role names.** Frames 21, 30, and 31 show "Front desk", "Viewer", and
  "Coach" as sample role names. The app knows permissions, not these names.
- **`check_ins:create` without `check_ins:read`.** Frame 31 hides Check in. If
  a role can check members in but cannot see visits, should Check in stay in
  the top bar?
- **Undo for a staff override** (frame 20). Should "Let in by staff" offer
  Undo like a normal check-in?
- **Best action for "not valid here"** (frames 14, 23). I used New sale (sell
  access that covers this location). Another option is no main action.

## 6. Not verified

- I did not run the app or open a browser. All states come from code.
- Phone and tablet frames on "Narrow screens" (19A2-0, 19F1-0) were not
  extended; that page is out of scope. They share the conflicts in section 3.
- The ordering in frame 20 (a 07:52 row above a 07:18 denial for the same
  member) assumes the member came back later.
- Dark mode was not reviewed.

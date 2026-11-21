# Session check-in

Staff mark a booked member as here on the Session details page. This is the only check-in. Walk-in
gym check-in left the product (issue #81): a member's page and Ctrl K have no `Check in` action.

## Sub-features

- `session-bulk`: choose booked members and mark them as here in one action.
- `session-row`: mark one member from the row's status mark.
- `no-walk-in`: the member page, Ctrl K, and the shortcuts sheet offer no `Check in`.

## How to reach it

- Open a session from Calendar, or from a program's page. The URL is `/chainsaw/calendar/<uuid>`.
- The bookings show in three groups: `Here`, `To arrive`, and `Cancelled`.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- Signed in as `kennedy@flowfokus.com` or `aiman@flowfokus.com`. Marking needs `bookings:manage`.
- The session has booked members under `To arrive`. Find one with:
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select o.id, o.starts_at from occurrences o join bookings b on b.occurrence_id = o.id where b.confirmed_at is not null and b.cancelled_at is null and b.attended_at is null group by 1, 2 order by 2"`.

Steps:

- **Open the session.** Go to `/chainsaw/calendar/<uuid>` and wait for `networkidle`. The level-1
  heading is the date and time.
- **Choose rows.** Run `page.getByRole('checkbox', { name: 'Choose Nurul Huda' }).click()` for each
  member. Do not use a pattern that also matches `Choose all rows`, the header box. A floating bar
  with `Check in` appears.
- **Mark them.** Run `page.getByRole('button', { name: /^Check in$/ }).click()`. A toast reads
  `3 members checked in`. The members move to `Here` with the time in green. `To arrive` and the
  count in the ribbon drop by three.
- **One row.** Click the status mark of a `To arrive` row, named `Check in <name>`. The member moves
  to `Here`.
- **No walk-in.** Sign in as `kennedy@flowfokus.com` for this step: other roles may not see `Sell`
  or `New sale for <name>`. Open a member's page. The top bar has `Sell` and no `Check in`. Press C:
  nothing happens. Press Ctrl K and type the name: the options are the member and
  `New sale for <name>`. Press Escape to close the menu, because it blocks single-key shortcuts.
  Then press `?`: the sheet lists no `Check in`.
- **Confirm the stored rows.** Run:
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select m.name, b.attended_at from bookings b join members m on m.id = b.member_id where b.occurrence_id = '<uuid>' order by b.attended_at"`.
  The marked members have an `attended_at` time.
- **Proof.** Screenshots of the session before, with three rows chosen, and after, then the member
  page and the Ctrl K list, plus the psql output.

## Gotchas

- The first `checkbox` named `Choose …` is `Choose all rows`. Match `^Choose (?!all)`.
- The Ctrl K option list opens only after hydration. Wait for `networkidle`.
- A marked member stays marked. Pick a session with enough `To arrive` rows for each run, or book
  more members first.
- The list shows `Here` only for bookings with an `attended_at` time.

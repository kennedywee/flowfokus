# Calendar

Staff see the sessions at the top bar location as a Day grid (a column per group) or a Week grid
(a row per group, Monday to Sunday). They group by None, Program, or Host, filter by program, switch
the three kinds on and off, and open a session. Calendar is the first page: `/chainsaw` opens it.

## Sub-features

- `calendar-day`: Day grid with an hour axis from 06 to 22, a now tag and line on today, and side by
  side blocks for sessions that overlap.
- `calendar-week`: Week grid with host rows by Monday to Sunday, today tinted and past days grey.
- `calendar-group`: Group by None, Program, or Host (the program's free-text `host_name`, and
  `No host` last).
- `calendar-filters`: the Program filter and the Classes, Appointments, and Events toggles with counts.
- `calendar-url`: view, date, group, program, and the switched-off kinds stay in the URL.
- `calendar-keys`: one tab stop; arrow keys move between blocks; Enter opens the session.
- `calendar-list`: below 768px the list replaces the grid.
- `calendar-redirect`: `/chainsaw/schedule` and `/chainsaw/schedule/<uuid>` open the new addresses.

## How to reach it

- Sign in. `/chainsaw` opens `/chainsaw/calendar`. The sidebar item is `Calendar`.
- Search parameters: `date=YYYY-MM-DD`, `view=week`, `group=none|program` (host is the default),
  `program=<uuid>,<uuid>`, and `hide=class,appointment,event`.
- Day and Week are in `getByRole('radio', { name: 'Week' })`. Group by is the button `Group by Host`,
  and its choices are `menuitemradio`. The kinds are buttons named `Classes 9`, `Appointments 3`,
  `Events 1`, each with `aria-pressed`.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- Signed in as `kennedy@flowfokus.com`. Reading needs `programs:read`.
- Find a busy week: `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select date_trunc('week', starts_at), count(*) from occurrences group by 1 order by 2 desc"`.

Steps:

- **Open it.** Go to `/chainsaw` and wait for `networkidle`. The URL becomes `/chainsaw/calendar`
  and the level-1 heading reads `Calendar`.
- **Day.** Go to `/chainsaw/calendar?date=<day>`. Each host is a column heading (`h3`) with its count.
  `.cal-block` is a session.
- **Group.** Click `Group by Host`, then the `Program` item. The URL gets `group=program`. Reload:
  the grouping stays.
- **Week.** Click the `Week` radio. The URL gets `view=week`. The heads read `Mon 23` to `Sun 29`.
  Use Previous week, Next week, and Today (links) to move.
- **Kinds.** Click `Appointments`. The URL gets `hide=appointment`, the block count drops, and the
  button has `aria-pressed="false"`.
- **Filter.** Click `Filter`, the `Program` item, and one program. A chip reads `Program is <name>`.
- **Keys.** Focus the one block with `tabindex="0"`. ArrowRight and ArrowLeft move between columns,
  ArrowDown and ArrowUp within one. Enter opens `/chainsaw/calendar/<uuid>`.
- **Redirect.** Go to `/chainsaw/schedule`: the URL becomes `/chainsaw/calendar`.
- **Phone.** At 390 pixels wide, `.cal-list` is visible and the grid is hidden.
- **Proof.** Screenshots of Day and Week in light and dark, with the URL for each, and the phone list.

## Gotchas

- Rails sends no booked member's name, so an appointment block says `Booked` or `Open`.
- The Day grid does not scroll by itself. The toolbar is in view on load. Scroll the page to reach
  the afternoon or the now line.
- Past sessions are washed out. A screenshot of a past week looks grey by design.
- The program filter and the kinds work on the loaded range; changing the view or the date reloads it.
- Seeded `Proof …` and `Bulk Failure …` programs from earlier runs share one time and fill a Day grid
  with narrow side by side blocks.

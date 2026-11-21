# Frontend preview

Portal screens use the Rails API wherever an endpoint exists. Frontend sample
records cover only features whose APIs are not implemented yet.

## Design reference

The reference is the Paper file
[Flowfokus Design](https://app.paper.design/file/01M7X4HENFQVWCFYKJH6A9QSXD/p-1-0).
The portal follows it: Geist type, zinc dark and light surfaces, hairline
borders, status colors, and its own icon set. Screens move to its layouts one
issue at a time; until then a screen keeps its layout on the new colors, type,
and icons. The earlier file "Flowfokus Redesign" (and the Paper file linked
before it) is history. The visual rules live in
[the design system](design-system.md) and `apps/portal/DESIGN.md`.

## API-backed screens

- App shell: the sidebar lists Calendar, Members, Sales, Programs, and Products,
  only the ones the role can read. The account control shows the actor from
  Rails. Top bar switchers: organization, actor, and locations from Rails. The
  organization list comes from `/staff/memberships`. The portal start, `/`,
  offers sign-in and opens the session's selected organization. A chooser is a
  fallback when no organization is selected and several memberships are available.
  The optional fixed demo actor opens Chainsaw directly. The chosen desk
  location is an HttpOnly cookie per organization. It sets the default
  location for new sales. Add location opens
  Settings.
- Members: the list (the member count, search, Display, sortable Member and
  Member since, and a page range), create, and view member records. The list
  has no Filter button and no Holds, Spent, or Balance due columns, because
  Rails does not supply them yet ([#17](https://github.com/kennedywee/flowfokus/issues/17)).
  The member page shows the hero with paid and balance due, the Horizon,
  Holds, Recent sales, Bookings, and Activity, and Contact on the right. It
  leaves out tags, phone, emergency contact, home location, notes, comments, the
  sale number, and each booking's location until Rails returns them (#17).
  Staff check a member in from the member page (C) or with Ctrl K. Sell (S) needs
  purchases:create. Renew, gym site link codes, and unlink are in the page's more
  menu.
- Sales: the list (the sale count, Filter by Payment and Fulfillment, search,
  Display, sortable Member, Date, and Amount, and a page range), New sale,
  and the sale page, where staff record payments, fulfill, refund, void, and end
  access. The list and sale page show only what Rails returns (the 100 newest
  sales). They leave out sale numbers, sold by, who recorded a payment, notes,
  comments, Send invoice, several lines in one sale, and fulfillment per line
  ([#18](https://github.com/kennedywee/flowfokus/issues/18)). The sale page's
  title is the product name. Record payment (P) and Fulfill items (F) are in the
  page's section headers; Refund, Revoke access, and Void are in its more menu.
- Calendar (`/calendar`, first page): the sessions at the top bar location as a
  Day grid (a column per host, program, or none) or a Week grid (a row per group,
  Monday to Sunday). The toolbar has Previous, Next, Today, the date with its
  session count, Group by, a Program filter, and Day and Week; a kinds row
  switches Classes, Appointments, and Events with a count each. View, date,
  group, program, and the switched-off kinds are in the URL. A block opens
  Session details; phones get a list. Hosts are the program's free-text host
  name, with "No host". It leaves out the month view (no Paper frame), the booked
  member's name on an appointment ("Booked" or "Open"), staff hosts
  ([#20](https://github.com/kennedywee/flowfokus/issues/20)), and open times from
  host availability ([#99](https://github.com/kennedywee/flowfokus/issues/99)).
  `/schedule` redirects.
- Session details: the date and time with "Starts in", the arrival ribbon (the
  members who are here, how many are still to arrive, and the spots open), and
  the bookings as Here, To arrive, and Cancelled. Staff mark a booked
  member as here on this page only: a row's status mark, A, the row menu, or Check in
  on the floating bar for chosen rows (one Rails attend call per row; Rails
  ignores a member who is already here). Staff also book a member, cancel a
  booking, and cancel the session. It leaves out No-show, a bulk check-in call,
  arrival times before check-in, the sale's payment state on a booking, staff
  hosts, notes, and activity ([#20](https://github.com/kennedywee/flowfokus/issues/20)).
- Programs: the list (the program count, Filter by Kind and Visibility, search,
  Display, sortable Program, Host, and Upcoming, and a page range), Program
  details, and New and Edit program. Program details has the fill rate for the
  last four weeks (derived from the sessions Rails returns), the chart of the
  last week and the next 30 days, the sessions with "Show all sessions", and Ways
  to book. Staff create programs, add sessions, publish, and add or change ticket
  prices. The screens leave out the weekly pattern line, bookings per way to
  book, staff hosts, and activity and comments
  ([#20](https://github.com/kennedywee/flowfokus/issues/20)).
- Products: the list (the product count, Filter by Type and Status, search,
  Display, sortable Status, Name, and Price, and a page range), Product details,
  and New and Edit product. Staff with `products:create` add products. Staff with
  `products:update` edit products and benefits, add prices, take prices off sale,
  and archive them. A product has many prices; a new amount or length is a new
  price, added on the product page. The screens show only what Rails returns. They
  leave out the active member or pass count, Revenue, Sales, and Average, credits
  left on passes, "Ending in 7 days", product activity and comments, and the
  active count and archive date of each price
  ([#21](https://github.com/kennedywee/flowfokus/issues/21)). The note is the
  hero's line. Sell (S) and Edit (E) are in the top bar; Add price is in the Prices
  header.
- Settings, General and Locations: the time zone, gym site publication, and
  locations, from Rails. Staff with `settings:manage` change them. The name
  comes from WorkOS. The currency is fixed.
- Settings, Staff and Roles: staff, pending invitations, and roles, through
  Rails and WorkOS. Staff with `staff:manage` invite, revoke, change roles, and
  remove access.

`apps/portal/src/lib/staff.functions.ts` holds the server functions for these
screens. They call Rails through the existing server boundary. The browser never
holds an API token. Rails owns validation, tenant isolation, and business rules.
These actions persist in PostgreSQL, including during local demo development.

## Screens with sample data

- Settings, Notifications: sample notification switches. Edits do not update
  Rails or contact external systems.
- Component gallery, `/components`: live examples of each component with
  sample records. Local development only, outside any organization. See
  [the design system](design-system.md#component-gallery). It shows the shared
  parts for the redesign (list table, filter bar, Display popover, row
  selection, groups, detail layout, hero, activity, background patterns, and
  data marks) on labelled sample members, bookings, and events. The
  Members list, Member details, the Sales screens, and the Products screens use them
  with real Rails data; the other screens follow in the issues #91, #92, and #94. It also shows the Horizon and the
  record section that Member details adds. See
  [portal design](../apps/portal/DESIGN.md#shared-parts-issue-87).

These screens display a Sample data label. Local edits reset when the screen
unmounts. The sample screen lives in `src/features/preview`. Real settings
views live in their domain folders. Shared filters live in
`components/Filters.tsx`, and feature layouts in `styles/features.css`.

## Removed screens

Home, Inbox, Agents, Check-ins, Reports, Settings Integrations, and What's new
left the product on 21 November 2026. See [Decisions](decisions.md). `/<org>`
and the old URLs of these pages open the first page in the sidebar the role can
read, which is Calendar for most roles (`lib/removed-pages.ts`, `lib/pages.ts`).
Walk-in gym check-in left the product too ([#81](https://github.com/kennedywee/flowfokus/issues/81)):
there is no Check in action on the member page or in ⌘K, and Rails has no
check-in endpoint.

## Run and verify

Use the Docker stack and open `http://localhost:4001`, or the host's Tailscale IP
on port 4001. The Rails server and database must be running for API-backed screens.
Local staff sign-in uses WorkOS Emulate. See [Local staff authentication](local-auth.md). The optional fixed demo actor remains explicit and disabled in production.

```sh
docker compose up -d
# Rebuild after changing Vite configuration or dependencies:
docker compose up -d --build --no-deps portal

docker compose exec -T portal bun run --cwd apps/portal test
docker compose exec -T portal bun run --cwd apps/portal typecheck
docker compose exec -T portal bun run --cwd apps/portal build
```

Route generation writes temporary files under `src/.tanstack/tmp`, on the same
Docker mount as `routeTree.gen.ts`. Git ignores the temporary directory.

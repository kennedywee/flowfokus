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

- Top bar switchers: organization, actor, and locations from Rails. The
  organization list comes from `/staff/memberships`. The portal start, `/`,
  offers sign-in and opens the session's selected organization. A chooser is a
  fallback when no organization is selected and several memberships are available.
  The optional fixed demo actor opens Chainsaw directly. The chosen desk
  location is an HttpOnly cookie per organization. It sets the default
  location for check-in and new sales. Add location opens
  Settings.
- Members: search, create, and view member records. Staff check a member in
  from the member page or with Ctrl K. Staff create gym site link codes and
  unlink members from their sign-in.
- Sales: list and create sales, record payments, deliver access, renew,
  refund, void, and end access.
- Schedule: sessions by day, the roster of each session, booking a member,
  cancelling a booking or a session, and marking attendance.
- Programs: create and edit programs, add sessions, and add or change ticket
  prices.
- Products: the membership catalog, prices, and availability. Staff with
  `products:create` add products. Staff with `products:update` edit products
  and benefits, add prices, take prices off sale, and archive them.
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
  [the design system](design-system.md#component-gallery).

These screens display a Sample data label. Local edits reset when the screen
unmounts. The sample screen lives in `src/features/preview`. Real settings
views live in their domain folders. Shared filters live in
`components/Filters.tsx`, and feature layouts in `styles/features.css`.

## Removed screens

Home, Inbox, Agents, Check-ins, Reports, Settings Integrations, and What's new
left the product on 21 November 2026. See [Decisions](decisions.md). `/<org>`
and the old URLs of these pages open the schedule (`lib/removed-pages.ts`).
Rails keeps the check-in endpoints until
[#81](https://github.com/kennedywee/flowfokus/issues/81) is decided.

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

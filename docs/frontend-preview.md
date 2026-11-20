# Frontend preview

Portal screens use the Rails API wherever an endpoint exists. Frontend sample
records cover only features whose APIs are not implemented yet.

## Design reference

The reference is the [Flowfokus Paper file](https://app.paper.design/file/01M5CMH3NK5Q37J3EJN86P3W5C/p-7-0).
The portal follows its redesign: Figtree type, dark and light surfaces,
hairline borders, status colors, and a centered page column. The visual rules
live in [the design system](design-system.md) and `apps/portal/DESIGN.md`.

## API-backed screens

- Top bar switchers: organization, actor, and locations from Rails. The
  organization list comes from `/staff/memberships`. The portal start, `/`,
  offers sign-in and opens the session's selected organization. A chooser is a
  fallback when no organization is selected and several memberships are available.
  The optional fixed demo actor opens Chainsaw directly. The chosen desk
  location is an HttpOnly cookie per organization. It sets the default
  location for check-in and new sales. Add location opens
  Settings.
- Home: today's sessions, what comes next, items that need attention, and
  check-in.
- Members: search, create, and view member records. Staff create gym site
  link codes and unlink members from their sign-in.
- Sales: list and create sales, record payments, deliver access, renew,
  refund, void, and end access.
- Check-ins: the same member and visit endpoints used by Home, with filters
  and CSV export.
- Schedule: sessions by day, the roster of each session, booking a member,
  cancelling a booking or a session, and marking attendance.
- Programs: create and edit programs, add sessions, and add or change ticket
  prices.
- Products: the membership catalog, prices, and availability. Staff with
  `products:create` add products. Staff with `products:update` edit products
  and benefits, add prices, take prices off sale, and archive them.
- Reports: weekly sales, payments, refunds, check-ins, and new members from
  `/staff/report`, in the organization time zone. Period and metric filters, a
  breakdown by location and payment method, and CSV export of the shown weeks.
  This is the page from before the redesign. See issue #23.
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

- Inbox: filter, read, resolve, and reopen sample updates.
- Agents: suggested prompts, prepared replies, and message drafts. No AI service
  is called and no message is sent.
- Settings, Notifications and Integrations: sample notification switches and
  integration states. Edits do not update Rails or contact external systems.
- What's new: static notes for the preview and portal layout. It opens from
  the account menu.
- Component gallery, `/components`: live examples of each component with
  sample records. Local development only, outside any organization. See
  [the design system](design-system.md#component-gallery).

These screens display a Sample data label. Local edits reset when the screen
unmounts. The sample fixtures live in `src/features/preview/data.ts` and the
individual preview components. Real check-in, report, and settings views live
in their domain folders. Shared filters live in `components/Filters.tsx`, CSV
export in `lib/export.ts`, and feature layouts in `styles/features.css`.

Existing `/<org>/soon?page=…` bookmarks redirect to the new routes.

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

# Frontend preview

Portal screens use the Rails API wherever an endpoint exists. Frontend sample
records cover only features whose APIs are not implemented yet.

## Design reference

The reference is the [Flowfokus Paper file](https://app.paper.design/file/01M5CMH3NK5Q37J3EJN86P3W5C/p-7-0).
Its Components page supplies tabs, table rows, chat, integrations, and state
controls. The portal keeps its Geist fonts, dark surfaces, hairline borders,
status colors, and centered page column.

## API-backed screens

- Organization chooser and sidebar: organization, actor, and locations from Rails.
- Overview: membership counts, recent visits, and check-in.
- Members: search, create, and view member records.
- Sales: list and create sales, record payments, and deliver access.
- Plans & offers: membership catalog, prices, and availability.
- Check-in: the same member and visit endpoints used by Overview, with filters
  and CSV export.

`apps/portal/src/lib/staff.functions.ts` holds the server functions for these
screens. They call Rails through the existing server boundary. The browser never
holds an API token. Rails owns validation, tenant isolation, and business rules.
These actions persist in PostgreSQL, including during local demo development.

## Screens with sample data

- Inbox: filter, read, resolve, and reopen sample updates.
- Agents: suggested prompts, prepared replies, and message drafts. No AI service
  is called and no message is sent.
- Reports: fixed historical sample weeks, period and metric filters, and CSV export.
- Settings: editable sample organization details, team invitations and roles,
  notification switches, and integration states. Initial organization name comes
  from the API. Edits do not update Rails or contact external systems.
- Branches: location names and addresses come from the API. Hours, managers,
  capacity, activity, and edits are frontend samples.
- Changelog: static notes for the preview and portal layout.

These screens display a Sample data label. Local edits reset when the screen
unmounts. Reports cover a fixed period ending 21 October 2026 and do not summarize
API sales. The sample fixtures live in `src/features/preview/data.ts` and the
individual preview components.

Existing `/<org>/soon?page=…` bookmarks redirect to the new routes.

## Run and verify

Use the Docker stack and open `http://localhost:4001`, or the host's Tailscale IP
on port 4001. The Rails server and database must be running for API-backed screens.
Local demo access remains explicit and disabled in production.

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

# Frontend preview

The development staff portal uses fake frontend data. It does not read or write
Rails records. Production keeps the existing server functions and refuses demo
access until real sign-in is implemented.

## Design reference

The reference is the [Flowfokus Paper file](https://app.paper.design/file/01M5CMH3NK5Q37J3EJN86P3W5C/p-7-0).
Its Components page supplies the tabs, table rows, chat, integrations, and state
controls. The implementation uses the existing Geist fonts, black surfaces,
hairline borders, status colors, and centered page column.

## Screens

- Overview: sample membership counts, recent visits, and check-in.
- Members: search, create, and open a member. Creation opens in a dialog.
- Sales: filter sales, create a sale, record a payment, and deliver access.
- Plans & offers: sample membership catalog and prices.
- Inbox: filter, read, resolve, and reopen sample updates.
- Agents: prompt suggestions, prepared replies, and message drafts. No AI call
  or message delivery occurs.
- Check-in: the same sample records and check-in action as Overview, with visit
  filters and CSV export.
- Reports: fixed historical sample weeks, period and metric filters, and CSV export.
- Settings: organization form, team invitations and roles, notification switches,
  and integration states. No external system is contacted.
- Branches: select, add, and edit sample location details.
- Changelog: notes for the preview and the current portal layout.

The `chainsaw` and `ironworks` organizations have separate sample records.
Existing `/<org>/soon?page=…` bookmarks redirect to the new routes.

## Data and lifetime

`apps/portal/src/lib/staff.functions.ts` chooses the mock adapter only when
`import.meta.env.DEV` is true. `staff.live.functions.ts` preserves the original
server functions. The mock adapter lives in `staff.mock.ts` and uses the generated
API schema types, so the existing screens keep their current data shapes.

Member, sale, payment, fulfillment, and visit changes remain in module memory
while navigating within the same browser tab. A full reload restores the initial
records. No access tokens or preview records are written to browser storage.
Preview behavior is only enough to exercise UI states; Rails remains the source
of production business rules.

Inbox, conversation, settings, team, and branch edits use local React state.
They reset when their screen unmounts. Reports use a fixed sample period ending
21 October 2026. These views do not claim to summarize newly created preview sales.

To change examples, edit `src/lib/staff.mock.ts` and
`src/features/preview/data.ts` inside the portal. The mock adapter test covers the
member → sale → payment → delivery → check-in flow and verifies that it makes no
HTTP requests.

## Run and verify

Use the existing Docker stack and open `http://localhost:3001`, or use the host's
Tailscale IP on port 3001. No API credentials are required for the frontend preview.
Rebuild the portal image once after pulling this change because its Vite
configuration changed:

```sh
docker compose up -d --build --no-deps portal
docker compose exec -T portal bun run --cwd apps/portal test
docker compose exec -T portal bun run --cwd apps/portal typecheck
docker compose exec -T portal bun run --cwd apps/portal build
```

Route generation writes temporary files under `src/.tanstack/tmp`. This keeps its
atomic file rename on the same Docker mount as `routeTree.gen.ts`. The temporary
directory is ignored by Git.

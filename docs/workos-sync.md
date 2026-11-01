# WorkOS identity sync

Rails keeps local copies of WorkOS users and staff memberships. Sync matches
records by WorkOS ID. It never matches accounts by email or links gym members
to login identities.

WorkOS remains the authority for identity and staff permissions. Rails still
checks verified access-token claims on protected requests. The local membership
copy supplies the portal's organization list and local associations.

## What sync changes

- Users: email, first name, and last name.
- Staff memberships: the linked user, organization, role, and status. An existing
  WorkOS membership ID cannot move to another user or organization.
- Already linked organizations: the name. Rails keeps the slug, currency,
  timezone, publication setting, locations, and business records.

Sync never creates or links a gym. Events for unknown organizations are saved
as ignored with the `organization_not_linked` outcome. Provisioning a gym is a
separate flow.

Deletions keep local rows and historical references. A deletion marker prevents
an old event from restoring the record. A new staff membership with a new
WorkOS ID can replace an old, deleted membership. A deleted user cannot sign in
with an unexpired token.
If deletion arrives before the user's details, Rails keeps a deleted reference;
its email can be empty. A live identity always needs an email.

A deleted WorkOS organization disappears from staff navigation. Its Rails
publication setting stays unchanged, so its public gym site can still serve.
Closing a gym and unpublishing its site need a separate product policy.

## Docker setup

The emulator seed file includes the local webhook endpoint
`http://server:4000/webhooks/workos`. Compose supplies the matching fake signing
secret to Rails. No WorkOS account is needed.

On an existing checkout, apply database changes explicitly, then reload the
emulator settings and restart Rails:

```sh
docker compose run --rm server bin/rails db:prepare
docker compose up -d --wait --force-recreate workos server
docker compose exec -T server bin/rails workos:reconcile
```

Restarting the emulator clears its sessions and regenerates membership IDs.
Restart Rails to clear cached signing keys, reconcile, and sign in again. Pinned
user and organization IDs stay stable. PostgreSQL business records stay in the
database volume.

The explicit reconciliation command imports existing users and memberships for
linked gyms. Seeded records do not deliver webhooks to endpoints in the same
seed file. Repeat reconciliation after an emulator restart or missed events.

To restore the Docker webhook destination after running apps on the host:

```sh
bun run workos:webhook
```

## Host app processes

`bun run dev` starts the emulator in Docker and points its webhook at
`http://host.docker.internal:4000/webhooks/workos`. Compose maps that name to the
Docker host gateway. Rails binds to `0.0.0.0` so the container can reach it.
The host firewall must also permit that container-to-host connection. If it
does not, use the Docker app stack for webhook testing or run the explicit
reconciliation command after identity changes.
Stop the Docker app containers before using host processes to avoid port
conflicts. PostgreSQL and the emulator stay in Docker.

For a manual import with the host Ruby runtime:

```sh
cd apps/server
WORKOS_API_KEY=sk_test_default WORKOS_API_BASE_URL=http://127.0.0.1:4100 bin/rails workos:reconcile
```

The local webhook secret is supplied by `scripts/dev`. Manual Rails startup
also needs `WORKOS_WEBHOOK_SECRET` from the local example settings.

## Event processing and recovery

`POST /webhooks/workos` checks the signature over the exact request body. The
signature timestamp uses milliseconds and must be within three minutes of the
server clock. The request body is limited to 1 MB.

Rails saves an accepted event in the `workos_events` table before it queues a
job. The WorkOS event ID is unique. Repeated deliveries use the saved event.
Older remote versions do not overwrite newer records. Processing failures keep
the event for inspection and retry.

If two events have the same remote version but different data, Rails records
`version_conflict` and changes nothing. Reconcile the gym to fetch and apply
WorkOS's current state. Event IDs are not used to guess which version is newer.

Inspect event counts and events that need attention:

```sh
docker compose exec -T server bin/rails workos:events:status
```

Retry failed events and pending events older than five minutes:

```sh
docker compose exec -T server bin/rails workos:events:retry
```

Reprocess one event after fixing its cause:

```sh
docker compose exec -T -e EVENT=event_example server bin/rails workos:events:retry
```

Import or repair one gym:

```sh
docker compose exec -T -e ORGANIZATION=chainsaw server bin/rails workos:reconcile
```

Reconciliation reads complete API results before writing. A failed fetch leaves
that gym unchanged. It preserves records that newer webhook processing already
updated. Commands exit with a nonzero status on failure.

The default Active Job adapter runs jobs in the Rails process. A restart can
lose queued jobs, but the saved events remain. Keep the ledger: it also
preserves deletion markers for identities never stored locally.

### Automatic recovery

`bin/rails workos:recover:watch` runs a recovery pass every `INTERVAL` seconds
(default 60). Compose runs it as the `flowfokus-jobs` container. Each pass:

1. Processes pending events older than five minutes, whose job was lost.
2. Retries failed events after a backoff of 2^attempts minutes, at most one
   hour. After 20 attempts an event waits for a person to run the retry command.
3. Reconciles each linked gym not fully synced for `RECONCILE_HOURS` (default 6;
   `0` turns it off). This repairs webhooks that never arrived.

The schedule is stored in the database, so restarts lose nothing. Sync is
idempotent, so two runners overlapping is safe. `bin/rails workos:recover` runs
one pass and prints a summary.

```sh
docker compose logs -f jobs
docker compose exec -T server bin/rails workos:recover
```

## Verify locally

With the Docker apps running:

```sh
bun run smoke:identity
bun run smoke:auth
bun run smoke:session
```

The identity check creates a temporary emulator user and staff membership. It
checks access without a Rails seed, name and role changes, rejected signatures,
duplicate delivery, and removal from organization navigation despite an old
token. It deletes the temporary remote identity afterward. Rails keeps the
local identity history.

## Access revocation and release boundary

A removed or downgraded staff membership does not immediately invalidate an
already issued access token. Rails uses its verified claims until `exp`, plus
five seconds of clock leeway. Rails does not set a maximum token lifetime.
The emulator currently issues one-hour tokens. The production lifetime and
required revocation delay must be verified and agreed before release.

Production requires `WORKOS_VERIFIED=true`, a real signing secret, and a real
API key. The sync client refuses a production API origin other than
`https://api.workos.com`. Never use the local fake credentials in production.
Real WorkOS integration and cloud deployment remain unverified. Run the jobs
process next to the API in production. Profile forms and password resets stay
with WorkOS AuthKit.

References: [WorkOS data syncing](https://workos.com/docs/events/data-syncing)
and [WorkOS Emulate 0.16.0](https://github.com/workos/emulate/tree/v0.16.0).

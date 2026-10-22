# Local staff authentication

Local staff sign-in uses WorkOS Emulate 0.16.0. It runs in Docker and needs no
WorkOS account or external credentials. The portal owns the browser session.
Rails verifies signed tokens and enforces organization access and permissions.
Plain HTTP development uses the encrypted, HttpOnly `hf_session` cookie.
HTTPS uses `__Host-hf_session` with the Secure flag. Neither cookie has a Domain
attribute, and the browser cannot read the tokens.

## Start

```sh
docker compose build
docker compose run --rm server bin/rails db:prepare
docker compose run --rm server bin/rails db:seed
docker compose up -d --wait
```

Open `http://localhost:4001`. Use the portal sign-in link to open the emulator's
login page. The callback returns to `http://localhost:4001/callback`.
If AuthKit asks you to select an organization, the portal opens that organization
directly. Use the top-bar switcher to change it later.

### Access from another device

Add this development machine's Tailscale IP to the host list in the root `.env`.
Keep localhost in the list so both addresses work. For example:

```dotenv
FLOWFOKUS_DEV_AUTH_HOSTS=localhost,127.0.0.1,100.89.45.88
FLOWFOKUS_WORKOS_BIND_IP=0.0.0.0
```

Use your machine's address from `tailscale ip -4`. The bind setting publishes
the fake-user emulator on port 4100, alongside the portal on port 4001.
Both ports must be reachable from the other device. The default binding is
loopback; remote access is opt-in.

After changing these settings, recreate the containers:

```sh
docker compose up -d --wait --force-recreate workos server portal
```

Open `http://<tailscale-ip>:4001` on the other device. Sign-in opens the same
host on port 4100, and the callback returns to that host on port 4001. The
portal and emulator accept only the configured development hosts. Production
keeps its configured callback URL. Sessions belong to each host, so signing in
on localhost does not also sign in on the Tailscale address.

Recreating the emulator clears its in-memory sessions. Restart Rails with it
to clear cached signing keys, then sign in again.

### Fake staff accounts

Each fake user has the password `local-password`:

- `demo.owner@flowfokus.test`: Owner at Chainsaw Gym. Can use the complete
  membership sale, payment, access delivery, and check-in workflow.
- `receptionist@example.com`: Receptionist at Chainsaw Gym. Can read members,
  offers, and sales, and check members in. Cannot create members, record sales,
  record payments, or deliver access.
- `ironworks.owner@example.com`: Owner at Ironworks Fitness. Has no access to
  Chainsaw Gym.
- `manager@example.com`: Owner at Chainsaw Gym and Receptionist at Ironworks
  Fitness. Use this account to test organization selection and switching.

These identities are fake and local. Their IDs match Rails seeds. Change users,
memberships, and roles in `workos-emulate.config.yaml`, then restart the emulator:

```sh
docker compose restart workos server
```

The emulator keeps sessions and users in memory. A restart reloads the seed file
and invalidates existing sessions. Restarting Rails also clears its cached signing
keys. Sign in again. PostgreSQL business records remain in the database volume.
Adding a new identity also needs a matching Rails
user reference; the existing seed users are prepared by `db:seed`.

## Verify

```sh
bun run smoke:auth
bun run smoke:session
```

The API check calls the local emulator and Rails. It checks signed tokens, organization
isolation, receptionist permissions, refresh-token rotation, session revocation,
and the existing membership workflow. It creates business records in the local
database. It does not test browser cookies or callback redirects; browser
verification is recorded separately in [Verification](verification.md).

The session check seals a test cookie containing a rejected access token and a
valid refresh token. It sends that cookie to the running portal and checks the
SDK's refresh fallback, the rotated response cookie, the next protected request,
and rejection after session revocation. Tokens remain in the check process.

`bun run smoke` remains available for the fixed demo actor. It requires demo
mode, or a server-side `FLOWFOKUS_ACCESS_TOKEN` for an authenticated local user.

## Fixed demo actor

The emulator is the default. To skip sign-in for a local UI demonstration, enable
the existing fixed demo actor explicitly:

```sh
FLOWFOKUS_DEMO_MODE=true docker compose up -d server portal
```

Return to emulator sign-in with:

```sh
FLOWFOKUS_DEMO_MODE=false docker compose up -d server portal
```

Production refuses demo mode. Emulator settings are development settings and
must never be used for production.

## Host app processes

`bun run setup` and `bun run dev` start PostgreSQL and WorkOS Emulate in Docker.
The app processes run on the host. The portal's `.dev.vars.example` contains the
host-compatible emulator configuration. Copy it to `.dev.vars` when configuring
an existing checkout. The Docker entrypoint writes its own internal service URLs.

Rails in Docker fetches keys from `http://workos:4100`. The browser reaches the
emulator through localhost or an allowed development host on port 4100.
The token issuer stays fixed at
`http://localhost:4100/user_management/client_flowfokus_local`.

## Scope

This milestone covers staff authentication. Gym member sign-in remains deferred.
Seeded gym members do not need WorkOS identities unless they must sign in.

The emulator does not prove compatibility with the live WorkOS service. Verify
AuthKit, refresh, sign-out, organization switching, and token verification against
WorkOS staging before enabling real production access. Cloudflare deployment,
live WorkOS sync, and production credentials remain separate work.

Both the portal and Rails require `WORKOS_VERIFIED=true` for production staff
access. Leave it unset until the real integration checks pass. Rails also rejects
local or HTTP issuer and signing-key URLs in production. The portal ignores
emulator host settings in production builds.

References: [WorkOS testing](https://workos.com/docs/authkit/testing) and the
[emulator source](https://github.com/workos/emulate).

---
name: verify-flowfokus
description: Launch the Flowfokus Docker stack, drive the staff portal (localhost:4001) and the gym site (chainsaw.localhost:4002) in a real browser the way staff and members do, and capture proof. Use when you must show that a Flowfokus feature works in the running app, not only in tests.
---

# Verify Flowfokus

Flowfokus is a membership platform for gyms. Users touch two web apps:

- **Staff portal** at `http://localhost:4001`. Staff sell memberships, record payments, fulfill
  sales, and check members in. This is the main surface.
- **Gym site** at `http://chainsaw.localhost:4002`. The public catalog, member sign-in, and member
  self-service. The host name picks the gym.

Both call the Rails API at `http://127.0.0.1:4000`. Sign-in uses WorkOS Emulate at
`http://localhost:4100`. Everything runs in Docker. Do not install or start host PostgreSQL.

Scripts live in `.agents/skills/verify-flowfokus/scripts/`. Run them from the repository root. The
feature recipes are in [features/README.md](features/README.md).

## Launch

```sh
.agents/skills/verify-flowfokus/scripts/launch           # keep the existing database
.agents/skills/verify-flowfokus/scripts/launch --fresh   # empty database first (destroys local data)
FLOWFOKUS_TEST_PAYMENTS=true .agents/skills/verify-flowfokus/scripts/launch   # online checkout on
```

`launch` does this:

1. It decides who owns the stack. If Flowfokus containers already run and this run did not create
   them, another run owns them: `launch` only runs the doctor, and refuses `--fresh`. If they are
   the containers this run created, `launch` rebuilds and prepares them again. Otherwise it starts
   a new stack. It records the mode and the ID of each container it created in
   `.artifacts/verify-flowfokus/started-by-run`, also when a later step fails.
2. `docker compose build`, then `docker compose up -d --wait db workos`.
3. `docker compose run --rm server bin/rails db:prepare`, then `bin/rails db:seed`. The project keeps
   database preparation explicit. Seeds are idempotent.
4. `docker compose up -d --wait` for all six containers: `flowfokus-db`, `flowfokus-workos`,
   `flowfokus-server`, `flowfokus-jobs`, `flowfokus-portal`, and `flowfokus-site`.
5. It waits until the apps serve real pages: Rails `/ready` returns `ok`, the portal start page has
   the sign-in link, and the gym site shows `Chainsaw`. Then it runs the doctor.

Ready means the doctor prints `READY`. On a machine with built images and an empty database this
takes about 30 seconds. The first image build takes several minutes.

Source is mounted into the containers. Code edits need no rebuild. Rebuild after a change to
`bun.lock`, `Gemfile.lock`, a Dockerfile, or web configuration outside `src`: run `launch` again.
After a new migration, run `launch` again too, then restart Rails with
`docker compose restart server jobs`, because a running Rails process keeps the old column list.

## Doctor

```sh
.agents/skills/verify-flowfokus/scripts/doctor
```

Read-only. Run it first, and again when anything looks wrong. It checks that:

- all six containers run;
- `flowfokus-server`, `flowfokus-portal`, and `flowfokus-site` mount this checkout, so they run the
  commit under test. It prints that commit, the branch, and the count of uncommitted paths;
- the online test payment setting, and a warning if dependency files changed after the image build;
- each container publishes its port: 4000, 4001, 4002, 4100;
- Rails `/ready`, emulator `/health`, the portal sign-in link, and the gym site home page answer;
- `kennedy@flowfokus.com` signs in at the emulator, and Rails accepts the token for Chainsaw
  Gym. The doctor revokes that session at once.

It exits non-zero and prints `FAIL` lines when the instance is not worth driving.

## Drive

Use Playwright through the skill's runner. It installs a pinned Playwright in a temporary folder
outside the project, and Chromium in `~/.cache/ms-playwright` if it is missing. It needs Node and
npm, which `mise.toml` pins:

```sh
.agents/skills/verify-flowfokus/scripts/run-playwright <script.mjs>
```

The runner copies only the one script file, so keep each script self-contained. The working
directory stays the repository root, so relative evidence paths land in `.artifacts/`.

Start from the working example. It signs in, creates a member, and saves proof:

```sh
.agents/skills/verify-flowfokus/scripts/run-playwright \
  .agents/skills/verify-flowfokus/scripts/proof-create-member.mjs
```

To prove another feature, copy that file into your run folder and replace its steps with the recipe
from the feature file. Keep its `signIn`, `shot`, `assert`, and `sql` functions.

### Accounts

Every password is `123123qwe`. The emulator seed is `workos-emulate.config.yaml`.

| Email | Where | Role |
| --- | --- | --- |
| `kennedy@flowfokus.com` | Chainsaw | Owner. Can do the full sale, payment, fulfillment, and check-in flow. |
| `rachel@flowfokus.com` | Both | Owner at Irongate, Manager at Chainsaw. Must pick an organization. |
| `aiman@flowfokus.com` | Chainsaw | Receptionist. Reads, and checks members in. Cannot create members or sales. |
| `patrick@example.com` | Gym site | No staff access. Matches the seeded member Patrick Ng after a link code. |

Seeded Chainsaw members: Aisyah Rahman, Ben Tan, Chloe Lim, and Patrick Ng. Seeded products:
Monthly Unlimited (RM 120.00), Monthly 8 Visits, 10-Class Pass, and the unpublished Staff Trial.
Locations: Bangsar and Mont Kiara. Irongate has the location George Town and the members Dinesh
Kumar and Sofia Wong.

### Stable handles

- Portal routes: `/chainsaw`, `/chainsaw/members`, `/chainsaw/members/new`, `/chainsaw/sales/new`,
  `/chainsaw/sales/<uuid>`, `/chainsaw/check-in`.
- The sidebar is `getByRole('navigation', { name: 'Staff pages' })`. The top bar is
  `getByRole('banner')`. It holds page actions such as `Check in`, `Sell`, and `Create sale`.
- Page titles are level-1 headings. Toasts appear in `getByRole('region', { name: /Notifications/ })`.
- Buttons with a keyboard hint have extra text in the name, for example `Create member Ctrl ↵`.
  Match them with a regular expression: `{ name: /^Create member/ }`.
- Inbox, Agents, and Reports are sample screens without Rails data. Do not use them as proof.

### Stored state

Read rows with psql in the database container. It is a second, read-only view of what the app
stored:

```sh
docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select ..."
```

Useful tables: `members`, `sales`, `sale_line_items`, `payments`, `fulfillments`,
`membership_periods`, `check_ins`, `member_link_codes`. Every tenant row has `organization_id`; join
`organizations` and filter on `slug`.

## Evidence

Put each run in `.artifacts/verify-flowfokus/runs/<timestamp>-<feature>/`. Git ignores
`.artifacts/`. Keep the capture script next to its output, so the run can repeat. A complete run
folder holds:

- numbered screenshots, named after what they show: `01-signed-in-home.png`;
- the Playwright video (`*.webm`);
- `assertions.md`, with the commit and each assertion as `passed`, `failed`, or `untested` with a
  reason;
- `db.txt` or another read-only view of the stored rows;
- `capture.mjs`, the script that produced the run.

Proof rules:

- Exercise the real user path. Do not call internal setters or test-only endpoints. Sign in through
  the WorkOS Emulate page, not with a sealed cookie or the demo token.
- Capture the action and the resulting state, not only the final screen.
- Check the side effects next to what is visible: rows inserted, payments stored, fulfillments and
  membership periods created, check-ins recorded.
- Use a mock only where production already isolates the external system. Here that is WorkOS
  Emulate for WorkOS, and the local test payment provider for online payments.
- When the safe path is a dry run or a test mode, observe what it skips. Do not trust its name. The
  test payment provider moves no money and skips a real provider webhook.

The `evidence-driven-testing` skill covers how to record a live session and how to post the proof
to a PR.

## Cleanup

```sh
.agents/skills/verify-flowfokus/scripts/cleanup
```

- If the marker is missing, this run did not start the stack, and cleanup changes nothing.
- If any container ID differs from the marker, someone recreated or replaced the stack after
  launch. It may belong to another run or checkout, so cleanup stops nothing, prints both lists,
  and exits non-zero.
- If `launch --fresh` started it, cleanup runs `docker compose down -v`. The run's database and its
  test records go with it.
- If plain `launch` started it, cleanup runs `docker compose down` and keeps the database volume.
  Records created by the run stay. Give them a run suffix, such as `Proof Member 123456`, so they
  are easy to recognize.

Cleanup never touches `.artifacts/verify-flowfokus/runs/`. The evidence stays there. The Playwright
runner removes its own temporary folder on exit. Stop any other process you started by its PID.

## Gotchas

- **Hydration.** The portal renders on the server first. Text typed before React hydrates is lost,
  and comboboxes open no options. After each `goto` or full navigation, run
  `await page.waitForLoadState('networkidle')` before you type.
- **Host names.** Use `localhost`, not `127.0.0.1`, for the portal. Sign-in redirects only to hosts in
  `FLOWFOKUS_DEV_AUTH_HOSTS`. The gym site needs the `chainsaw.localhost` host name; `localhost:4002`
  has no gym.
- **The `Check in` button** is in the top bar on Home and on `/chainsaw/check-in`. It is not on sale
  or member pages.
- **Emulator restarts** clear its in-memory sessions. Restart Rails too
  (`docker compose restart server`), then sign in again.
- **Fixed container names.** One Flowfokus stack can run on a machine. If another checkout started
  it, the doctor reports a mount from another path. Do not drive it.
- **The local `.env`** may bind the emulator on `0.0.0.0` and list extra hosts for remote devices.
  This does not change the localhost recipes.
- **First Playwright run** downloads Chromium, about 300 MB, into `~/.cache/ms-playwright`.

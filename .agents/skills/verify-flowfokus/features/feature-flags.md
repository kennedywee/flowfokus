# Feature flags

A Flowfokus developer sets each feature to Off, Labs, or On for a gym in Settings, Developer,
Features. Staff who can change settings turn a Labs feature on or off in Settings, Labs. The first
feature is `gym_site`: the gym site and Settings, Gym site follow it.

## Sub-features

- `flag-developer-page`: Developer, Features shows the WorkOS organization ID and an Off, Labs, On
  control per feature, only for `dana@flowfokus.com`.
- `flag-off`: with `gym_site` Off, the gym site shows `No gym at this address`, and Settings has no
  Gym site and no Labs.
- `flag-labs`: with `gym_site` in Labs, the site stays hidden, and Settings lists Labs with a `Beta`
  tag and a switch.
- `flag-labs-switch`: an Owner turns the Labs switch on (the site opens, Gym site returns) and off.
- `flag-on`: with `gym_site` On, the site opens, Gym site shows, and Labs leaves the list.
- `flag-owner-limits`: an Owner has no Developer group, `?settings=features` opens General, and
  Invite staff offers no Developer role.

## How to reach it

- `?settings=features` on any Chainsaw portal address, as Dana. The account menu's Settings, then
  Developer, Features.
- `?settings=labs` on any Chainsaw portal address, when a feature is in Labs.
- The gym site at `http://chainsaw.localhost:4002/`.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- `gym_site` is On for Chainsaw. The seed sets it. Check with
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select f.state, f.enabled from features f join organizations o on o.id = f.organization_id where o.slug = 'chainsaw' and f.key = 'gym_site'"`.
  It prints `on|f`. After a failed run, set it On again from Developer, Features.

The script `.agents/skills/verify-flowfokus/scripts/proof-feature-flags.mjs` runs every step below and
writes the proof, with `db.txt` holding the stored state after each step.

- **Developer page.** Sign in as `dana@flowfokus.com` and open `/chainsaw/calendar?settings=features`.
  The level-2 heading reads `Features`, the row `WorkOS organization ID` shows `org_chainsaw`, and the
  pages include a `Developer` group.
- **Off.** Choose the `Off` radio in the Gym site row. A toast reads `Gym site · Off`. The gym site
  shows the level-1 heading `No gym at this address`. Settings has no `Gym site`; opening
  `?settings=gym-site` shows General.
- **Labs.** Choose `Labs`. The site stays hidden. Settings lists `Labs`.
- **Owner turns it on.** Sign in as `kennedy@flowfokus.com` in another browser context and open
  `?settings=labs`. The row shows `Beta`. Turn on the `Gym site` switch: a toast reads
  `Gym site turned on`, the site shows `Chainsaw`, and `Gym site` returns to Settings. Turn it off:
  the site hides again.
- **Owner limits.** As Kennedy, `?settings=features` opens General, and the pages have no
  `Developer` group. In `?settings=staff`, `Invite staff` lists no `Developer` role.
- **On.** As Dana, choose `On`. The site shows `Chainsaw`, Settings shows `Gym site`, and `Labs`
  leaves the list.

## Gotchas

- The toast text also appears in the toast's Dismiss button. Match it with `exact: true`.
- The portal reloads the organization after each change. Wait for `networkidle` before you read the
  Settings pages.
- If `dana@flowfokus.com` gets `Cannot open "chainsaw"`, the local copy of WorkOS memberships is out
  of date. Run `docker compose exec server bin/rails workos:reconcile`.

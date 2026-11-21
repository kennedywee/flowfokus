# Feature flags

A feature flag decides whether one organization has a feature. Decided in [#82](https://github.com/kennedywee/flowfokus/issues/82) on 21 November 2026.

## States

A feature has one state per organization:

| State | Meaning |
| --- | --- |
| Off | The organization does not have the feature. |
| Labs | Settings, Labs lists the feature with a Beta tag. Staff with `settings:manage` turn it on or off for their organization. |
| On | The organization has the feature. Labs does not list it. |

A feature is **in effect** when its state is On, or when its state is Labs and the organization turned it on.

- The list of features lives in Rails code: `Feature::LIST` in `apps/server/app/models/feature.rb`.
- The state per organization lives in the `features` table. An organization with no row for a feature has it Off, so new organizations start with every feature Off.
- Rails decides whether a feature is in effect (`Organization#feature?`). The portal and the site only read the answer.
- Moving a feature out of Labs clears the organization's choice. If it returns to Labs, it starts turned off.
- The database keeps one row per organization and feature, a known state, and a Labs choice only in Labs. These checks load from `db/schema.rb`.

## Who changes what

| Who | Where | What |
| --- | --- | --- |
| Staff with `features:manage` (the Developer role) | Settings, Developer, Features | Sets each feature to Off, Labs, or On. The page also shows the WorkOS organization ID. |
| Staff with `settings:manage` | Settings, Labs | Turns a Labs feature on or off. |
| Other staff | Settings, Labs | See the Labs features with a lock line. |

Only the Developer role holds `features:manage`, so a gym cannot switch its own features On. See [Authorization](authorization.md#implemented-permissions).

## API

- `GET /staff/organization` returns `features` (the keys in effect) and `labs` (the features in Labs, with the organization's choice).
- `GET /staff/features` and `PATCH /staff/features/{key}` list and set states. They need `features:manage`.
- `PATCH /staff/labs/{key}` turns a Labs feature on or off. It needs `settings:manage`. A feature that is not in Labs is not found.

Feature keys are an `x-extensible-enum` in `openapi.yaml`: a client must accept a key it does not know.

## Features

| Key | Covers | Not in effect |
| --- | --- | --- |
| `gym_site` | The gym site for the organization (`apps/site`), and Settings, Gym site. | Rails does not serve the organization on `/public` and `/member`, so the site shows its not-found page. Settings hides Gym site. |

`gym_site` changes only whether the gym site exists for an organization. When it is in effect, `published` stays the owner's switch for going live. The migration that added flags set `gym_site` On for every published organization, so no live site disappeared. The local seed sets it On for Chainsaw.

## Live WorkOS setup

Add to the WorkOS environment, as `workos-emulate.config.yaml` does locally:

1. The permission `features:manage`.
2. The role `developer`, named Developer, with every Owner permission plus `features:manage`. When a billing permission arrives, Developer does not get it.
3. Give the Developer role only to Flowfokus staff. The `Team` rule stops an Owner from granting it, because Owners do not hold `features:manage`.

The Developer role sees the gym's member and payment data, as an Owner does. The Paper frame "Settings · Developer features" says otherwise; the decision in #82 replaces that text.

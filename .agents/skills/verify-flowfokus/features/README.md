# Flowfokus verification map

This folder is the maintained source for verifying what staff and members can do in Flowfokus. Read
this index before you drive the app. Then use the matching feature file as the recipe.

## Baseline

- Launch with `.agents/skills/verify-flowfokus/scripts/launch`. The portal is at
  `http://localhost:4001`, and the gym site is at `http://chainsaw.localhost:4002`.
- The seeds create Chainsaw (`chainsaw`) with the locations Bangsar and Mont Kiara, the members
  Aisyah Rahman, Ben Tan, Chloe Lim, and Patrick Ng, and the products listed in the skill. A second gym,
  Irongate (`irongate`), exists for tenant isolation.
- Staff accounts and the member account are in the skill's Accounts table. The password is
  `123123qwe` for all of them.
- Run the doctor. It must print `READY`, the commit under test, and a working sign-in.
- Never drive a stack that the doctor says mounts another checkout.

## Driving rules

- Start each recipe from the baseline, unless its preconditions say otherwise.
- Sign in through the portal or site `Sign in` link and the WorkOS Emulate pages.
- Prefer ARIA roles and accessible names to CSS selectors and DOM position.
- After each full navigation, wait for `networkidle` before you type. See the skill's Gotchas.
- Treat each command as literal. Keep quoted names unchanged.
- Give each record you create a run suffix, so a repeated run does not collide with an earlier one.
- Do not remove the evidence during cleanup.

## Proof and skips

- Capture the user's action and the resulting state, not only the final screen.
- UI proof is a screenshot with the page heading visible, and the text of the element that changed.
- A change to stored data also needs a second, read-only view: a psql query in `flowfokus-db`.
- Record the feature and the entry point with each capture.
- Report a path that you could not reach, with the command you tried and the missing precondition.
- Do not report a skipped entry point as verified through another path.

## Feature file contract

Each feature file starts with a `#` title and one paragraph that describes what the user can do.
Then it has these four `##` sections, in this order:

1. `Sub-features`: short IDs, with one line for each behavior.
2. `How to reach it`: every entry point a user has.
3. `How to drive it`: the preconditions, then one bullet for each step. Each bullet pairs the user's
   action with the exact command and the result that you can observe.
4. `Gotchas`: the traps that waste a run or make it invalid.

Keep implementation details out of the map. Name only user paths, stable handles, required state,
commands, and observable proof.

## Features

- [Staff sign-in](staff-sign-in.md): sign-in through WorkOS Emulate, organization choice, roles, and
  sign-out.
- [Members](members.md): create a member, validation, the list, and the stored row. Has a ready proof
  script.
- [Desk sale](desk-sale.md): sell a product, record a payment, and fulfill the sale.
- [Check-in](check-in.md): check in a member with active access, and the refused case.
- [Gym site member](gym-site-member.md): public catalog, member sign-in, account linking, and online
  checkout.

## Driven on 19 November 2026

- Members: driven end to end with `scripts/proof-create-member.mjs`.
- Staff sign-in as Kennedy, desk sale with cash and fulfillment, check-in from a member's page, the gym
  site catalog, and member sign-in up to the link-code form: driven while writing the recipes, without
  saved evidence.
- Not driven yet: organization choice for `rachel@flowfokus.com`, receptionist limits, sign-out,
  refused check-in, link codes, and online checkout.

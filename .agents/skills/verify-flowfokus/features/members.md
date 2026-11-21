# Members

Staff with permission create a member record for their gym. The member appears in the members list,
and the record belongs to that gym only.

## Sub-features

- `member-open`: opens an empty New member form.
- `member-invalid`: refuses a form without a name or a valid email.
- `member-save`: stores a name and an email, then opens the member page.
- `member-list`: lists the new member on the Members page.
- `member-list-display`: the list shows a count, sorts by Member and Member since, hides the email
  line and the Member since column from Display, searches with `?q=`, and pages 50 at a time.
- `member-permission`: a Receptionist sees no way to create a member.

## How to reach it

- Choose `New member` in the top bar of `/chainsaw/members`.
- Open `/chainsaw/members/new` directly.
- On New sale, when the gym has no members, the Member section shows a `New member` link.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- No Chainsaw member has the email that you will use. Use a run suffix:
  `Proof Member <suffix>` and `proof.<suffix>@example.com`.

The script `.agents/skills/verify-flowfokus/scripts/proof-create-member.mjs` runs the first five
steps and writes all the proof.

- **Sign in.** Sign in as `kennedy@flowfokus.com`. The URL becomes `http://localhost:4001/chainsaw/calendar`
  and the heading reads `Calendar`.
- **Open the form.** Choose `Members` in the sidebar, then `New member`. The URL becomes
  `/chainsaw/members/new`, and the heading reads `New member`. Run:
  `page.getByRole('navigation', { name: 'Staff pages' }).getByRole('link', { name: 'Members' }).click()`,
  then `page.getByRole('link', { name: 'New member' }).click()`.
- **Refuse an empty form.** Choose `Create member` with both fields empty. An alert reads
  `The member was not created`, it links `Full name` and `Email`, and the URL does not change. Run:
  `page.getByRole('button', { name: /^Create member/ }).click()`.
- **Save.** Fill both fields and choose `Create member`. Run
  `page.getByRole('textbox', { name: 'Full name' }).fill(name)` and
  `page.getByRole('textbox', { name: 'Email' }).fill(email)`. The URL matches
  `/chainsaw/members/<uuid>`, and the level-1 heading is the name.
- **Confirm the list.** Open `/chainsaw/members`. The `Members` table has a link whose name starts
  with the new name and contains the email.
- **Confirm the stored row.** Run:
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select m.name, m.email, o.slug from members m join organizations o on o.id = m.organization_id where m.email = '<email>'"`.
  It prints one row that ends in `|chainsaw`. The Chainsaw member count rose by one.
- **Permission.** Sign in as `aiman@flowfokus.com` in a new browser context and open
  `/chainsaw/members`. There is no `New member` link. Open `/chainsaw/members/new`: a notice reads
  `You cannot add members`.
- **Proof.** Screenshots of the refused form, the filled form, the member page, and the list, plus
  the psql output.

## Gotchas

- The `Create member` button name includes the keyboard hint. Match it with `/^Create member/`.
- Type only after `networkidle`. Text typed before hydration is lost, and the save looks broken.
- The `Member created` toast disappears. Assert the member page heading, not the toast.
- Members cannot be deleted from the portal. A run on a kept database leaves its member behind. Use a
  run suffix, or launch with `--fresh`.
- The receptionist step was not driven when this map was written.

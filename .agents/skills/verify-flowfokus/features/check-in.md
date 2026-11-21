# Check-in

Staff check a member in at the current location. A member with active access is admitted and the
visit is recorded. A member without access is refused, and the refusal is recorded too.

## Sub-features

- `checkin-admit`: a member with an active membership is checked in.
- `checkin-list`: the visit appears in the Activity list on the member's page.
- `checkin-refuse`: a member without access is refused with a reason.

## How to reach it

- Choose `Check in` in the top bar on a member's page (`/chainsaw/members/<uuid>`), or press `C`.
- Press Ctrl K, type the member's name, and choose `Check in <name>`.

There is no check-in list page. The Check-ins page left the product on 21 November 2026.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- Signed in as `kennedy@flowfokus.com` or `aiman@flowfokus.com`. The location combobox in the
  banner reads `Bangsar`.
- For `checkin-admit`, the member has a fulfilled membership. Run [Desk sale](desk-sale.md) for Chloe
  Lim first. On fresh seeds, no member has access.

Steps:

- **Open the member.** Open `/chainsaw/members`, wait for `networkidle`, and choose the member's
  link. The level-1 heading is the member's name.
- **Admit.** Run `page.getByRole('banner').getByRole('button', { name: /^Check in/ }).click()`. A
  toast reads `Chloe Lim checked in`. The page's Activity list gains a line `Checked in at Bangsar`.
- **Search entry.** Press Ctrl K, run `page.getByRole('combobox').fill('Chloe')`, and choose the
  option `Check in Chloe Lim`. The same toast shows.
- **Refuse.** Open `Ben Tan`, who has no membership on fresh seeds, and choose `Check in`. The
  dialog `Ben Tan can't check in` states why. Record the exact text in your evidence.
- **Confirm the stored rows.** Run:
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select m.name, c.result, c.denial_reason, l.name from check_ins c join members m on m.id = c.member_id join locations l on l.id = c.location_id order by c.created_at desc limit 5"`.
  The admitted visit shows an admitted result at `Bangsar`. The refused one shows its denial reason.
- **Proof.** Screenshots of the member page with the toast, the Activity list, and the refusal
  dialog, plus the psql output.

## Gotchas

- The `Check in` button is not in the top bar on sale pages. Go to a member's page.
- The Ctrl K option list opens only after hydration. Wait for `networkidle`.
- Each check-in counts against limited products, such as Monthly 8 Visits. Use Monthly Unlimited for
  repeat runs.
- `checkin-refuse` and the member-page entry point were not driven when this map was written. The
  refusal text and the stored `result` values still need a first run.

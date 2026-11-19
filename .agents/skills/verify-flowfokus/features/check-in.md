# Check-in

Staff check a member in at the current location. A member with active access is admitted and the
visit is recorded. A member without access is refused, and the refusal is recorded too.

## Sub-features

- `checkin-admit`: a member with an active membership is checked in.
- `checkin-list`: the visit appears on the Check-ins page and in Home's count.
- `checkin-refuse`: a member without access is refused with a reason.

## How to reach it

- Choose `Check in` in the top bar on Home (`/chainsaw`).
- Choose `Check in` in the top bar on `/chainsaw/check-in`.
- Choose `Check in` on a member's page.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- Signed in as `kennedy@flowfokus.com` or `aiman@flowfokus.com`. The location combobox in the
  banner reads `Bangsar`.
- For `checkin-admit`, the member has a fulfilled membership. Run [Desk sale](desk-sale.md) for Chloe
  Lim first. On fresh seeds, no member has access.

Steps:

- **Open the dialog.** On Home, wait for `networkidle`, then run
  `page.getByRole('banner').getByRole('button', { name: 'Check in' }).click()`. The `Check in` dialog
  opens with the `Find member` combobox.
- **Admit.** Run `page.getByRole('combobox', { name: 'Find member' }).fill('Chloe')`, then
  `page.getByRole('option', { name: /Chloe Lim/ }).click()`. Choosing the member checks them in. A
  toast reads `Chloe Lim checked in`. Home's `Today` aside shows `Check-ins` rising by one.
- **List.** Open `/chainsaw/check-in`. The region `Today's check-ins` has a link like
  `12:25 Chloe Lim Bangsar Checked in`.
- **Refuse.** Open the dialog again and choose `Ben Tan`, who has no membership on fresh seeds. The
  dialog or a toast states that he was not admitted and why. Record the exact text in your evidence.
- **Confirm the stored rows.** Run:
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select m.name, c.result, c.denial_reason, l.name from check_ins c join members m on m.id = c.member_id join locations l on l.id = c.location_id order by c.created_at desc limit 5"`.
  The admitted visit shows an admitted result at `Bangsar`. The refused one shows its denial reason.
- **Proof.** Screenshots of the dialog with the member chosen, the toast, the Check-ins list, and
  the refusal, plus the psql output.

## Gotchas

- The `Check in` button is not in the top bar on sale pages. Go to Home or `/chainsaw/check-in`.
- The `Find member` option list opens only after hydration. Wait for `networkidle`.
- Each check-in counts against limited products, such as Monthly 8 Visits. Use Monthly Unlimited for
  repeat runs.
- `checkin-refuse` and the member-page entry point were not driven when this map was written. The
  refusal text and the stored `result` values still need a first run.

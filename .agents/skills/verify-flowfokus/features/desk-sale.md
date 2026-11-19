# Desk sale

Staff sell a product to a member at the front desk, record the money the desk received, and fulfill
the sale. Fulfillment creates the membership period and its access rights. Payment and fulfillment
are separate facts.

## Sub-features

- `sale-build`: pick a member, a product, and a location.
- `sale-payment`: add a cash or bank transfer payment before the sale exists.
- `sale-create`: create the sale and open its page as `Paid` and `Unfulfilled`.
- `sale-fulfill`: fulfill the sale and show the membership dates.
- `sale-unpaid`: a sale without full payment cannot be fulfilled in the normal way.

## How to reach it

- Choose `Sell` in the top bar on Home.
- Choose `Sell` on a member's page. The member is already chosen.
- Open `/chainsaw/sales/new` directly.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- Signed in as `kennedy@flowfokus.com`.
- The member has no active Monthly Unlimited membership, or you accept a renewal. Chloe Lim fits on a
  fresh database.

Steps:

- **Open New sale.** Open `/chainsaw/sales/new` and wait for `networkidle`. The heading reads
  `New sale`. `Record payment` is disabled until a product is added.
- **Pick the member.** Run `page.getByRole('combobox', { name: 'Member' }).click()`, then
  `.fill('Chloe')`, then `page.getByRole('option', { name: /Chloe Lim/ }).click()`. The aside shows
  `Change member: Chloe Lim`.
- **Add the product.** Run `page.getByRole('button', { name: 'Product' }).click()`. The `Add product`
  dialog opens. Run `dialog.getByRole('radio', { name: /Monthly Unlimited/ }).click()` and
  `dialog.getByRole('button', { name: 'Add product' }).click()`. The Products region shows
  `Monthly Unlimited` and `Total RM 120.00`. Payment shows `Balance due RM 120.00`.
- **Record the payment.** Run `page.getByRole('button', { name: 'Record payment' }).click()`. The
  dialog shows `RM 120.00 due`, `Cash` checked, and `Amount` `120.00`. Run
  `dialog.getByRole('button', { name: 'Add payment' }).click()`. Payment shows
  `Balance due RM 0.00`. Nothing is saved yet.
- **Create the sale.** Run `page.getByRole('button', { name: 'Create sale' }).click()`. The URL matches
  `/chainsaw/sales/<uuid>`. The heading reads `Monthly Unlimited`, with `Paid` and `Unfulfilled`. A
  toast reads `Sale created`.
- **Fulfill.** Run `page.getByRole('region', { name: 'Items' }).getByRole('button', { name: 'Fulfill' }).click()`.
  The `Fulfill` dialog says the member gets Monthly Unlimited for 30 days. Run
  `dialog.getByRole('button', { name: 'Fulfill' }).click()`. The page shows `Paid` and `Fulfilled`,
  the date range from today to 30 days later, and the link `See Chloe Lim's access`. Activity lists
  `Fulfilled`, `Paid RM 120.00 by cash`, and `Sold · RM 120.00`.
- **Confirm the stored rows.** With the sale id from the URL, run:
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select s.total_minor, s.paid_minor, p.amount_minor, p.payment_method, (select count(*) from fulfillments f join sale_line_items li on li.id = f.sale_line_item_id where li.sale_id = s.id) from sales s join payments p on p.sale_id = s.id where s.id = '<sale id>'"`.
  It prints `12000|12000|12000|cash|1`. A `membership_periods` row for that fulfillment exists.
- **Proof.** Screenshots of the built sale with the balance, the new sale page, and the fulfilled
  page, plus the psql output.

## Gotchas

- Type in the Member combobox only after `networkidle`. Before hydration, no options appear.
- `Fulfill` appears twice when the dialog is open: the Items button and the dialog button. Scope
  each to its region or dialog.
- The `Sale actions` menu in the banner also holds `Record payment` and `Fulfill`. It is a second
  entry point to the same dialogs.
- Payments record money the desk already received. Nothing is charged. Do not report this as a
  payment provider test.
- `sale-unpaid` and the early-fulfillment reason were not driven when this map was written.

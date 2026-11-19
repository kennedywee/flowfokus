# Gym site member

The public gym site shows the gym's memberships, passes, and locations. A member signs in, links the
account with a code from the front desk, and sees their access. With test payments on, a member can
buy online.

## Sub-features

- `site-catalog`: the home page lists published products and locations.
- `site-signin`: a member signs in through WorkOS Emulate.
- `site-link`: a link code from staff connects the sign-in to the member record.
- `site-account`: the account page shows the membership and purchases the desk recorded.
- `site-checkout`: a linked member buys a product online and pays on the test payment page.

## How to reach it

- Open `http://chainsaw.localhost:4002/`. The banner and the hero both have `Member sign-in`.
- Open `http://chainsaw.localhost:4002/sign-in`, then choose `Sign in`.
- In the portal, the member page of Mei Lim has `Create link code`.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- For `site-checkout`, launch with `FLOWFOKUS_TEST_PAYMENTS=true`. The doctor prints
  `online test payments: true`.

Steps:

- **Catalog.** Open `/` and wait for `networkidle`. The heading reads `Chainsaw Gym`. The region
  `Memberships and passes` lists `Monthly Unlimited` at `RM 120.00`, and the region `Locations` lists
  `Bangsar` and `Mont Kiara`. `Staff Trial` is unpublished and must not appear.
- **Sign in.** Open `/sign-in` and run `page.getByRole('link', { name: 'Sign in' }).click()`. On the
  emulator pages, enter `member@example.com`, choose `Continue`, enter `local-password`, and choose
  `Continue`. The URL becomes `http://chainsaw.localhost:4002/account`.
- **Unlinked account.** The heading reads `Link your account to Chainsaw Gym`, with the textbox
  `Link code` and the button `Link my account`. The text `Signed in as member@example.com` shows.
- **Get a code.** In a portal context signed in as the demo owner, open Mei Lim from
  `/chainsaw/members` and choose `Create link code`. The code shows once.
- **Link.** On the site, fill `Link code` with that code and choose `Link my account`. The account
  page then shows Mei's membership, rights, and purchases.
- **Checkout.** With test payments on, choose a product's buy button on the site, then pay on the
  clearly marked test payment page. The account lists the purchase. In the portal, Sales lists an
  online sale with no staff actor or location.
- **Confirm the stored rows.** Run:
  `docker exec flowfokus-db psql -U flowfokus -d flowfokus_development -Atc "select s.channel, s.total_minor, s.paid_minor, p.provider from sales s left join payments p on p.sale_id = s.id order by s.created_at desc limit 3"`.
  The newest row is the online sale, paid through the test provider.
- **Proof.** Screenshots of the catalog, the unlinked account page, the linked account page, the
  test payment page, and the portal sale, plus the psql output.

## Gotchas

- Use the host `chainsaw.localhost`. `localhost:4002` has no gym, and `ironworks.localhost:4002`
  shows the other tenant.
- A matching email never links a member. Only the code does.
- The link code shows once, works once, and expires after seven days. Capture it from the portal
  page in the same run.
- Without `FLOWFOKUS_TEST_PAYMENTS=true`, products show `Cash or bank transfer at the front desk` and
  no buy button. That is correct, not a failure.
- The test provider moves no money and has no real provider webhook. Report online checkout as
  verified against the test provider only.
- Only the catalog, sign-in, and the unlinked account page were driven when this map was written.
  Link codes, the linked account, and checkout follow `docs/local-auth.md` and
  `docs/verification.md`. Their button names still need a first run.

# Staff sign-in

Staff sign in to the portal through WorkOS. The portal opens their gym, or lets them choose when they
belong to more than one. Each role sees only the actions it may use.

## Sub-features

- `signin-owner`: an Owner with one gym lands on that gym's Calendar.
- `signin-choose`: a user in two gyms picks one, and the portal opens it.
- `signin-switch`: the top-bar organization switcher changes the gym.
- `signin-role`: a Receptionist sees no create actions.
- `signin-signout`: sign-out ends the session.

## How to reach it

- Open `http://localhost:4001/` and choose `Sign in`.
- Open a protected page, such as `/chainsaw/members`, while signed out. The portal sends you to
  sign in.
- Open `http://localhost:4001/sign-in?returnTo=/chainsaw/members` to return to a page after sign-in.

## How to drive it

Preconditions:

- The doctor prints `READY`.
- Use a new browser context for each account.

Steps:

- **Signed-out start.** Open `/`. The heading reads `Sign in to Flowfokus`. Run:
  `page.getByRole('link', { name: 'Sign in' }).click()`.
- **Email page.** The URL starts with `http://localhost:4100/user_management/authorize`, and the
  heading reads `Sign In`. Run `page.getByRole('textbox', { name: 'Email' }).fill('kennedy@flowfokus.com')`
  and `page.getByRole('button', { name: 'Continue' }).click()`.
- **Password page.** The heading reads `Enter your password`. Run
  `page.getByRole('textbox', { name: 'Password' }).fill('123123qwe')` and
  `page.getByRole('button', { name: 'Continue' }).click()`.
- **Calendar.** The URL becomes `http://localhost:4001/chainsaw/calendar` (`/chainsaw` and the
  old `/chainsaw/schedule` redirect there). The heading reads `Calendar`. The banner has
  `combobox "Organization: Chainsaw. Change organization"`, and the sidebar has the account
  button `Kennedy Wee · Owner , account menu`.
- **Choose a gym.** Sign in as `rachel@flowfokus.com`. AuthKit or the portal asks for an organization.
  Choose `Irongate`. The URL becomes `/irongate/calendar`. Open Members: it lists `Dinesh Kumar`
  and no Chainsaw member.
- **Switch.** Open the organization combobox in the banner and choose Chainsaw. The URL becomes
  `/chainsaw/calendar`.
- **Role.** Sign in as `aiman@flowfokus.com`. On `/chainsaw/members` there is no `New member`
  link. On a member's page the banner has no `Sell` button. ⌘K offers no `New sale` action.
- **Sign out.** Open the account menu in the sidebar and choose the sign-out item. The start page
  shows `Sign in to Flowfokus` again. Opening `/chainsaw/members` asks you to sign in.
- **Proof.** Screenshots of the emulator pages, Calendar with the organization combobox, and the
  signed-out start page. For roles, a screenshot of each role's banner.

## Gotchas

- Use `localhost`. The portal refuses sign-in from hosts outside `FLOWFOKUS_DEV_AUTH_HOSTS` with a
  403 plain-text page.
- The emulator page also offers `Pick an account`. Type the email instead, so the run uses the same
  path as a person.
- Restarting `flowfokus-workos` ends every session. Restart `flowfokus-server` with it.
- `scripts/doctor` and `bun run smoke:auth` prove tokens and Rails access only. They do not prove the
  browser sign-in.
- Only the Kennedy path was driven when this map was written. The manager, receptionist, switch,
  and sign-out steps follow the docs and the code, not a run.

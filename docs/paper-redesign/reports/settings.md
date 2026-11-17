# Settings, sign-in, and screens outside an organization

Paper page: "Settings & sign-in" (`p-S-0`). The nine original frames are unchanged.
New frames sit below them in five rows: General (y 1080), Locations (y 2160),
Staff (y 3240), Invite staff (y 4320), and Sign in (y 5400).

## 1. Coverage

| Real screen or state (app) | Paper artboard | Status |
| --- | --- | --- |
| Settings, Organization section (time zone, gym site public, name, currency) | Settings — General | existed |
| Organization: role without settings:manage (view only) | Settings — General — View only | added |
| Organization: validation error on a field | Settings — General — Name error | added |
| Organization: saving | Settings — General — Saving | added |
| Organization: save failed | Settings — General — Not saved | added |
| Organization: "Settings saved" toast | Settings — General — Saved | added |
| Organization: gym site published switch | Gym site row in every new General frame | added (see 2) |
| Locations list | Settings — Locations | existed |
| Add location dialog | Settings — Locations — New location | added |
| Edit (rename) location dialog | Settings — Locations — Rename | added |
| Location name error (blank or taken) | Settings — Locations — Name error | added |
| Location save failed | Settings — Locations — Not saved | added |
| "Location added" / "Location saved" toast | Settings — Locations — Added | added |
| Locations, role without settings:manage | Settings — Locations — View only | added |
| One location only | Settings — Locations — One location | added |
| No locations | Settings — Locations — No locations | added |
| Remove a location | — | not designed: the app and Rails have no remove |
| Team list (members and pending invitations) | Settings — Staff | existed |
| Change a member's role | Settings — Staff — Staff menu | added |
| Remove access (menu, then confirm) | Staff menu; Settings — Staff — Remove access? | added |
| Revoke a pending invitation | Settings — Staff — Invitation menu | added |
| Role changed toast | Settings — Staff — Role changed | added |
| Role change refused (last manager, own access, missing permission) | Settings — Staff — Role not changed | added |
| Access removed toast | Settings — Staff — Access removed | added |
| Invitation revoked toast | Settings — Staff — Invitation revoked | added |
| No staff besides the owner, no invitations | Settings — Staff — Only you | added |
| Role without staff:manage | Settings — Staff — No permission | added |
| Team did not load | Settings — Staff — Did not load | added |
| Your own row: no change or remove | Settings — Staff (owner row has no ⋯) | existed |
| Inactive or pending member status | — | not designed: rare WorkOS sync state; see 5 |
| Resend invitation | — | not designed: the app has no resend |
| Invite staff dialog | Settings — Invite staff | existed |
| Invite: email error | Settings — Invite staff — Email error | added |
| Invite: request failed | Settings — Invite staff — Not sent | added |
| Invite: sending | Settings — Invite staff — Sending | added |
| Invite: only grantable roles (Manager inviting) | Settings — Invite staff — Fewer roles | added |
| "Invitation sent" toast with the new row | Settings — Staff — Invitation sent | added |
| Notifications section | — | not designed: sample data in the app (see 4) |
| Integrations section | — | not designed: sample data in the app (see 4) |
| Theme choice (account menu) | Home page: "App — Account menu, Theme" | existed (other page) |
| Sign-in at WorkOS | Sign in | existed |
| Portal start, signed out (also after sign-out) | Sign in — Portal start, signed out | added |
| Sign-in failed or cancelled (`?sign_in=failed`) | Sign in — Did not finish | added |
| Session expired | — | not designed: the app sends the browser straight to WorkOS sign-in with a return address; there is no portal screen |
| Several organizations | Sign in — Choose organization | added |
| One organization | — | not designed: the app opens it directly |
| Signed in, no organization | Sign in — No staff access | added |
| Organization list did not load | Sign in — Organizations did not load | added |
| Staff access is turned off (Blocked + AccessUnavailable) | Sign in — Staff access is turned off | added |
| Cannot open "<organization>" | Sign in — Cannot open organization | added |
| Page not found | Sign in — Page not found | added |
| App error screen | Sign in — Something went wrong | added (the app has none; see 4) |

## 2. Added

General (all cloned from "Settings — General"):

- **Name error.** Name field empty, red border, "Enter the gym's name". The save bar stays.
- **View only.** Daniel · Manager. Values are plain text. No save bar. The Public switch is dimmed. One line with a lock: "View only. Changing these needs a role that can change settings."
- **Saving.** Save bar with "Saving…" and both buttons dimmed.
- **Not saved.** Save bar shows "Settings were not saved. Try again." with Discard and Save changes.
- **Saved.** New name in the page, the breadcrumb, and the sidebar. Toast "Settings saved".
- Every new General frame has a **Public** switch at the right of the Gym site row. It is the app's "publish the gym site" setting. The original General frame lacks it; add it there when the screen is built.

Locations (cloned from "Settings — Locations"; dialogs follow the Invite staff dialog at 480px):

- **New location.** Dialog with Name (focused) and Address (Optional). Cancel and Add location.
- **Rename.** "Edit Bangsar" with name and address filled. Save location. A row click opens it.
- **Name error.** "Another location is already called Bangsar" under the Name field.
- **Not saved.** "The location was not saved. Try again." in the dialog footer.
- **Added.** Petaling Jaya row (no address, no hours, 0 and 0), "4 locations", toast "Location added · Petaling Jaya".
- **View only.** No New location button, no row chevrons, lock line.
- **One location.** One row, "1 location".
- **No locations.** One line: "No locations yet. Add one before the first sale or check-in." The top bar keeps New location.

Staff (cloned from "Settings — Staff"):

- **Staff menu.** Daniel's ⋯ opens a menu: Role (Manager ✓, Front desk, Coach), then Remove access… in red. The row is highlighted.
- **Invitation menu.** siti's ⋯ opens Revoke invitation.
- **Remove access?** Confirm in the "Discard this sale?" style: "Daniel can no longer open Chainsaw Gym. This can take a few minutes. Their past sales and check-ins stay."
- **Role changed.** Daniel's role reads Front desk. Toast "Daniel Wong is now Front desk".
- **Role not changed.** Error toast "Role not changed. Someone else must keep the right to manage staff."
- **Access removed.** Daniel's row is gone, "4 staff", toast.
- **Invitation revoked.** siti's row is gone, "4 staff", toast.
- **Invitation sent.** New farid row, "Invite sent just now", "6 staff", toast.
- **Only you.** Owner row, "1 staff".
- **No permission.** Aina · Coach. No Invite staff. Lock line "Seeing staff needs a role that can manage staff."
- **Did not load.** No Invite staff. "Staff did not load. Reload the page to try again."

Invite staff (cloned from "Settings — Invite staff"):

- **Email error**, **Not sent**, **Sending** as named.
- **Fewer roles.** Daniel · Manager. Only Coach and Front desk show, because staff can grant only roles whose permissions they hold.

Sign in (cloned from "Sign in"; same card, logo, title, and dark button):

- **Portal start, signed out.** "Sign in to Flowfokus" and Sign in. This is the portal's own start page; the original "Sign in" frame is the WorkOS page after it.
- **Did not finish.** Error line and Sign in.
- **Choose organization.** Three organizations with role, chevrons, then the account line "kennedy@… · Sign out".
- **No staff access.** Message and the account line.
- **Organizations did not load.** Error line and the account line.
- **Staff access is turned off.** Warning line. No action, as in the app.
- **Cannot open "chainsaw".** Error line, Go to the staff portal, account line.
- **Page not found.** Line and Go to the staff portal.
- **Something went wrong.** Line and Reload.

## 3. Conflicts

- **Roles.** Paper's roles are Owner, Manager, Front desk, Coach. The local WorkOS roles are Owner, Manager, Receptionist. Paper's Roles frame says Manager cannot "change settings and staff". The local Manager role holds staff:manage, so it can open Staff. Rails roles come from WorkOS, so the two need one agreed list.
- **Paper's Staff list counts the pending invitation as staff** ("5 staff" with siti). The app lists members and invitations apart. The new frames keep Paper's count rule.

## 4. Needs app or Rails work

Settings shown in Paper that the app lacks:

- General: logo, editable name (Rails has no name update), contact email, week start, member ID prefix. The app's gym site address is `<slug>.flowfokus.com`; Paper shows `.flowfokus.app`.
- Locations: open hours, home member count, staff count, a location detail page (Paper rows have chevrons), and removing a location.
- Staff: last active, locations per staff member, "Invite sent 2 days ago" (the app shows the expiry date), the role menu in ⋯ (the app uses a select), resend invitation, and locations in the invite.
- Invite staff: role descriptions on the role cards; locations field.
- Payments section: whole screen (Stripe, payment method switches, receipt details).
- Booking rules section: whole screen.
- Roles section: whole screen (the app has no roles view).
- Profile section: whole screen (photo, name, password, devices, email alerts).
- Settings navigation: the app uses section tabs (Organization, Locations, Team, Notifications, Integrations) on one page. Paper uses a settings sidebar with Back to app. Section names change: Organization → General, Team → Staff.
- Sample data in the app today: **Notifications** and **Integrations** are sample screens with a "Sample data" pill. Nothing is saved or sent. Paper has no frame for them (Profile has "Email me when"). Remove them or design them later.
- App error screen: `__root.tsx` has a not-found screen but no error screen.
- Copy to fix in the app:
  - AccessUnavailable texts name env vars and WORKOS settings (`WORKOS_VERIFIED`, `FLOWFOKUS_DEMO_TOKEN`). Staff need the plain text drawn in Paper. Keep the technical detail for logs or an admin page.
  - "Only staff with staff:manage can see the team" names a permission code.
  - "Your role can view these settings but not change them" → the Paper line.
  - Role change and remove toasts say "at their next session refresh"; Paper says "This can take a few minutes".
  - Rails Team refusals name permission codes ("At least one active member must keep staff:manage", "…holds X, which you do not hold"). Map them to plain text as in "Role not changed".
  - Location name taken returns "has already been taken"; Paper says "Another location is already called Bangsar".
  - The invite sent toast names WorkOS.

## 5. Open questions

1. Is the original "Sign in" frame the WorkOS AuthKit page (to brand in WorkOS), or should the portal own email and password sign-in? Today sign-in happens at WorkOS, after the portal start page.
2. Should a location row open a detail page (Paper's chevron) or the edit dialog (the app)?
3. Which role list wins: Paper's four roles or the WorkOS roles?
4. Should Staff show inactive or not-yet-synced members, and how? The app shows a status pill; Paper has no status column.
5. Notifications and Integrations: drop them or design them?
6. Should a session expiry show a portal notice before WorkOS, or keep the direct redirect?

## 6. Not verified

- I did not run the app. All states come from reading the code and the Rails Team and Location models.
- The exact Rails validation messages per field were read from the model, not from a live response.
- I did not apply the full sidebar from the Home page; the brief leaves that to a later pass.
- The Theme menu frame lives on the Home page; I checked that it exists but did not review it.

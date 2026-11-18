# Settings, sign-in, and screens outside an organization

Paper page: "Settings & sign-in" (`p-S-0`). The nine original frames are
unchanged. I added **42 frames**: 5 General, 10 Locations, 15 Staff,
3 Invite staff, and 9 sign-in screens. They sit below the originals in five
rows: General (y 1080), Locations (y 2160), Staff (y 3240), Invite staff and
Manager view (y 4320), and Sign in (y 5400).

**Role model used in these frames.** The frames follow Paper's
"Settings — Roles" frame, because Paper is the target until the user decides
(see Open question 1). Only the Owner can invite, change roles, revoke, or
remove access, and only the Owner changes settings. A Manager can view the
staff list and settings but not change them. Front desk and Coach do not see
the staff list. Chainsaw Gym has one Owner, Kennedy. Nobody acts on their own
row, so the Owner row never has a ⋯ button.

## 1. Coverage

| Real screen or state (app) | Paper artboard | Status |
| --- | --- | --- |
| Settings, Organization section (time zone, gym site public, name, currency) | Settings — General | existed |
| Organization: role that can view but not change settings | Settings — General — View only | added |
| Organization: validation error on a field | Settings — General — Name error | added |
| Organization: saving | Settings — General — Saving | added |
| Organization: save failed | Settings — General — Not saved | added |
| Organization: "Settings saved" toast | Settings — General — Saved | added |
| Organization: gym site published switch | Gym site row in every new General frame | added (see 2) |
| Locations list | Settings — Locations | existed |
| Add location dialog | Settings — Locations — New location | added |
| Edit location dialog | Settings — Locations — Edit | added |
| Location dialog while saving | Settings — Locations — Saving | added |
| Location name error (blank or taken) | Settings — Locations — Name error | added |
| Location save failed | Settings — Locations — Not saved | added |
| "Location added" toast | Settings — Locations — Added | added |
| "Location saved" toast after an edit | Settings — Locations — Saved | added |
| Locations, role that can view but not change settings | Settings — Locations — View only | added |
| One location only | Settings — Locations — One location | added |
| No locations | Settings — Locations — No locations | added |
| Remove a location | — | not designed: the app and Rails have no remove (`locations only: create, update`) |
| Team list (members and pending invitations) | Settings — Staff | existed |
| Change a member's role | Settings — Staff — Staff menu | added |
| Remove access: confirm | Settings — Staff — Remove access? | added |
| Remove access: pending | Settings — Staff — Removing access | added |
| Remove access: failed | Settings — Staff — Access not removed | added |
| Revoke a pending invitation | Settings — Staff — Invitation menu | added |
| Revoke invitation: failed | Settings — Staff — Invitation not revoked | added |
| Role changed toast | Settings — Staff — Role changed | added |
| Role change refused (the list is out of date) | Settings — Staff — Role not changed | added |
| Access removed toast | Settings — Staff — Access removed | added |
| Invitation revoked toast | Settings — Staff — Invitation revoked | added |
| No staff besides the owner, no invitations | Settings — Staff — Only you | added |
| Staff list as a Manager sees it (view only) | Settings — Staff — Manager view | added |
| Role that cannot see the staff list | Settings — Staff — No permission | added |
| Team did not load | Settings — Staff — Did not load | added |
| Your own row and the last Owner: no change or remove | Owner row has no ⋯ in every frame | existed |
| Inactive or pending member status | — | not designed: rare WorkOS sync state; see 5 |
| Resend invitation | — | not designed: the app has no resend |
| Invite staff dialog | Settings — Invite staff | existed |
| Invite: email error | Settings — Invite staff — Email error | added |
| Invite: request failed | Settings — Invite staff — Not sent | added |
| Invite: sending | Settings — Invite staff — Sending | added |
| "Invitation sent" toast with the new row | Settings — Staff — Invitation sent | added |
| Notifications section | — | not designed: sample data in the app (see 4) |
| Integrations section | — | not designed: sample data in the app (see 4) |
| Theme choice (account menu) | Home page: "App — Account menu, Theme" | existed (other page) |
| Sign-in page | Sign in | existed |
| Portal start, signed out (also after sign-out) | Sign in — portal start (sign-in at the identity provider) | added, pending Open question 2 |
| Sign-in failed or cancelled (`?sign_in=failed`) | Sign in — Did not finish | added |
| Session expired | — | not designed: the app sends the browser straight to sign-in with a return address; there is no portal screen |
| Several organizations | Sign in — Choose organization | added |
| One organization | — | not designed: the app opens it directly |
| Signed in, no organization | Sign in — No staff access | added |
| Organization list did not load | Sign in — Organizations did not load | added |
| Staff access is turned off (Blocked + AccessUnavailable) | Sign in — Staff access is turned off | added |
| Cannot open "<organization>" | Sign in — Cannot open organization | added |
| Page not found | Sign in — Page not found | added |
| App error screen | Sign in — Something went wrong | added (the app has none; see 4) |

## 2. Added

General (cloned from "Settings — General"):

- **Name error.** Name field empty, red border, "Enter the gym's name".
- **View only.** Daniel · Manager. Values are plain text. The logo shows without "Replace". No save bar. The Public switch is dimmed. Lock line: "View only. Changing these needs a role that can change settings."
- **Saving.** Name stays in its input with the new value. Save bar shows "Saving…", buttons dimmed.
- **Not saved.** Name stays in its input. Save bar shows "Settings were not saved. Try again." with Discard and Save changes.
- **Saved.** New name in the page, the breadcrumb, and the sidebar. Toast "Settings saved".
- Every new General frame has a **Public** switch at the right of the Gym site row. It is the app's "publish the gym site" setting. Add it to the original General frame when the screen is built.

Locations (cloned from "Settings — Locations"; dialogs are 480px):

- **New location**, **Edit** ("Edit Bangsar"), **Saving** (Saving…, Cancel and close dimmed), **Name error** ("Another location is already called Bangsar"), **Not saved** ("The location was not saved. Try again." in the footer).
- **Added.** Petaling Jaya row, "4 locations", toast "Location added · Petaling Jaya".
- **Saved.** Mont Kiara renamed to Mont Kiara Plaza in the list, toast "Location saved · Mont Kiara Plaza".
- **View only.** No New location, no chevrons; the empty chevron lane stays so columns line up with the original. Lock line.
- **One location** and **No locations** (one line; New location stays in the top bar).

Staff (cloned from "Settings — Staff"; viewer is Kennedy · Owner unless stated):

- **Staff menu.** Daniel's ⋯: Role (Manager ✓, Front desk, Coach), then Remove access… in red. Owner is not offered, because Paper shows one Owner and no Owner role card.
- **Invitation menu.** siti's ⋯: Revoke invitation.
- **Remove access?** Confirm in the "Discard this sale?" style. **Removing access** shows the same dialog with "Removing…" and dimmed buttons.
- **Role changed.** Daniel reads Front desk. Toast "Daniel Wong is now Front desk. This can take a few minutes."
- **Role not changed.** Error toast "Role not changed. Daniel's access changed elsewhere. Reload the page."
- **Access removed** (Daniel gone, "4 staff"), **Access not removed** (error toast "Access was not removed. Try again.", list unchanged).
- **Invitation revoked** (siti gone, "4 staff"), **Invitation not revoked** (error toast, list unchanged).
- **Invitation sent.** New farid row, "Invite sent just now", "6 staff", toast.
- **Only you.** Owner row, "1 staff".
- **Manager view.** Daniel · Manager. The full list with no Invite staff and no ⋯ on any row. Lock line "View only. Inviting and changing staff needs the Owner role."
- **No permission.** Aina · Coach. Lock line "Seeing staff needs a role that can manage staff."
- **Did not load.** "Staff did not load. Reload the page to try again." No Invite staff.

Invite staff (cloned from "Settings — Invite staff"; Owner only):

- **Email error**, **Not sent** (error in the footer), **Sending** (Sending…, Cancel and close dimmed).

Sign in (cloned from "Sign in"; same card, logo, title, and dark button):

- **Portal start (sign-in at the identity provider).** "Sign in to Flowfokus" and Sign in. Pending Open question 2.
- **Did not finish.** Error line and Sign in.
- **Choose organization.** Three organizations with role, then "kennedy@… · Sign out".
- **No staff access.** Message and the account line.
- **Organizations did not load.** "Reload the page to try again." and the account line.
- **Staff access is turned off.** Warning line. No action, as in the app.
- **Cannot open "chainsawgym".** "This organization did not open. It may not exist, or you are not staff there." Go to the staff portal and the account line.
- **Page not found.** Line and Go to the staff portal.
- **Something went wrong.** "The page could not open. Reload to try again." and Reload.

## 3. Conflicts

- **Role names.** Paper: Owner, Manager, Front desk, Coach. App and local WorkOS: Owner, Manager, Receptionist. There is no Coach role in the app.
- **Who manages staff.** Paper's Roles frame: only the Owner may "change settings and staff". App: the Manager role holds `staff:manage` (not `settings:manage`), so a Manager can invite, change roles, revoke, and remove access. These frames follow Paper.
- **Grant only what you hold.** The app lets staff grant only roles whose permissions they hold (`Team#grantable`). Under Paper's model only the Owner grants roles, and the Owner holds everything, so the rule never shows. It matters only if the user chooses the app's role model. Then a Manager's Invite dialog and role menu offer Manager, Coach, and Front desk, and never Owner, and a Manager has no ⋯ on the Owner row.
- **Staff count.** Paper's Staff list counts the pending invitation as staff ("5 staff" with siti). The app lists members and invitations apart. The new frames keep Paper's rule.

## 4. Needs app or Rails work

Settings shown in Paper that the app lacks.

Build status, 18 November 2026: **Built** means the portal does it now.
**Needs Rails** means it waits on Rails data; the portal does not fake it.
The decisions of 18 Nov 2026 apply: the app's three roles (Owner, Manager,
Receptionist), the WorkOS sign-in page, location rows that open the edit
dialog, and a status mark for members who are not active.

- General: logo, editable name (Rails has no name update), contact email, week start, member ID prefix. The app's gym site address is `<slug>.flowfokus.com`; Paper shows `.flowfokus.app`.
  Status: Built for what Rails stores: the name and currency as text, the gym site address (`<slug>.flowfokus.com`, as the app has it) with Paper's Public switch, and the time zone, behind Paper's save bar. Logo, editable name, contact email, week start, and member ID prefix need Rails.
- Locations: open hours, home member count, staff count, a location detail page (Paper rows have chevrons), and removing a location.
  Status: Built for the list (pin, name, address, chevron, count), New location, and the edit dialog, which a row opens (decision: no detail page). Open hours, counts, and removing a location need Rails.
- Staff: last active, locations per staff member, "Invite sent 2 days ago" (the app shows the expiry date), the role menu in ⋯ (the app uses a select), resend invitation, and locations in the invite.
  Status: Built for the role menu in ⋯ (Role with a check, then Remove access…), revoke in the invitation's ⋯, and the pending invitation with "Invite expires 21 Nov" in warning colour. Rails gives the expiry, not the day the invite was sent. A Status column holds "Active", or Paper's status style for "Not synced yet" and "Inactive". Last active, staff locations, resend invitation, and locations in the invite need Rails.
- Roles: Paper's four roles and its permission table (see Conflicts). The app has no Roles view.
  Status: Built with the app's three roles. Roles opens from the Staff top bar. Its columns and ticks come live from the WorkOS roles that Rails returns with the staff list, so nothing is hard-coded per role. Rows name groups of permissions in staff words ("Refund and void sales"); "Some" marks a role that holds part of a group. Only staff who can manage staff see it.
- Invite staff: role descriptions on the role cards; locations field.
  Status: Built for the email and Paper's role cards, offering only the roles the viewer may grant. Role descriptions and the locations field need Rails.
- Payments, Booking rules, Profile: whole screens.
  Status: Needs Rails. They are not in the settings sidebar.
- Settings navigation: the app uses section tabs (Organization, Locations, Team, Notifications, Integrations). Paper uses a settings sidebar with Back to app. Organization → General, Team → Staff.
  Status: Built. Each section has its own address (`/settings/general`, `/locations`, `/staff`, `/roles`). Old `?section=Organization` and `?section=Team` links still open General and Staff. ⌘, opens Settings. The location switcher's Manage locations opens Locations. Phones get a section list and a "‹ Settings" back link.
- Sample data in the app today: **Notifications** and **Integrations** are sample screens with a "Sample data" pill. Nothing is saved or sent. Paper has no frame for them (Profile has "Email me when").
  Status: Built. They live in `features/preview/SettingsSamples.tsx`, under "Samples" after the real sections, with the pill and a note.
- App error screen: `__root.tsx` has a not-found screen but no error screen.
  Status: Built: "Something went wrong" with Reload, in the sign-in card.
- A refused role change should reload the list or say to reload; today the app shows the Rails message.
  Status: Built. The toast says "Role not changed. Daniel's access changed elsewhere. Reload the page." and the list reloads.
- Copy to fix in the app (all built):
  - AccessUnavailable texts name env vars and WorkOS settings. Staff need the plain text drawn in Paper.
  - "Only staff with staff:manage can see the team" names a permission code.
  - "Your role can view these settings but not change them" → the Paper line.
  - Role change and remove toasts say "at their next session refresh"; Paper says "This can take a few minutes".
  - Rails Team refusals name permission codes. Map them to plain text.
  - Location name taken returns "has already been taken"; Paper says "Another location is already called Bangsar".
  - The invite sent toast names WorkOS.
  - "Cannot open" shows the same text for a missing organization and a server failure; Paper uses one line that covers both.
- Sign-in pages.
  Status: Built. The portal start, Did not finish, Choose organization, No staff access, Organizations did not load, Staff access is turned off, Cannot open, and Page not found all use Paper's sign-in card. Sign in goes to the WorkOS sign-in page; the portal has no password form (decision of 18 Nov 2026).

## 5. Open questions

1. **Which role model wins?**

   | | Paper (these frames) | App today |
   | --- | --- | --- |
   | Roles | Owner, Manager, Front desk, Coach | Owner, Manager, Receptionist |
   | Manager and staff | Views only; cannot invite, change roles, or remove | Can invite, change roles, revoke, and remove (holds `staff:manage`) |
   | Manager and settings | Views only | Views only |

   - **Choose Paper:** change the WorkOS roles (add Coach, rename Receptionist to Front desk, take `staff:manage` from Manager). Every gym's staff changes then wait on the Owner. The frames here are already right.
   - **Choose the app:** keep the WorkOS roles. Redraw Paper's Roles frame, rename Front desk and drop Coach, and add Manager frames for staff changes: the Invite dialog and the role menu with only the roles a Manager holds, and no ⋯ on the Owner row. About four more frames.
2. **Sign-in: which screen is the design?** The original "Sign in" card has email and password fields in the portal. The app sends staff to the identity provider's page (WorkOS) to sign in, after a portal start page with one button. If the identity provider's page is the design, the original card is its branding and the portal start card can go. If the portal must own email and password, the app needs its own sign-in.
3. Should a location row open a detail page (Paper's chevron) or the edit dialog (the app)?
4. Should Staff show inactive or not-yet-synced members, and how? The app shows a status pill; Paper has no status column.
5. Notifications and Integrations: drop them or design them?
6. Does Paper mean one Owner only? The app lets an Owner make another Owner.

## 6. Not verified

- I did not run the app. All states come from reading the code and the Rails Team and Location models.
- The exact Rails validation messages were read from the model, not from a live response.
- I did not apply the full sidebar from the Home page; the brief leaves that to a later pass.
- The Theme menu frame lives on the Home page; I checked that it exists but did not review it.

## 7. Review fixes

Must fix:

1. Fewer roles: fixed. Under Paper's roles a Manager never opens Invite, so the frame is replaced by "Settings — Staff — Manager view" (no Invite, no ⋯ on any row). The grant rule is under Conflicts.
2. Role not changed: fixed. The toast now shows a refusal staff can hit: "Daniel's access changed elsewhere. Reload the page."

Should fix:

1. Conflicts: confirmed and kept; the frames follow Paper's Roles frame. The choice is Open question 1.
2. General View only, "Replace" link: fixed (removed).
3. General Saving and Not saved, Name as plain text: fixed (input kept, not focused).
4. Role changed toast delay: fixed ("This can take a few minutes.").
5. Something went wrong promise: fixed ("The page could not open. Reload to try again.").
6. Portal start next to Sign in: renamed "Sign in — portal start (sign-in at the identity provider)", pending Open question 2. The original card is unchanged.
7. Missing states: fixed. Added Locations — Saved, Locations — Saving, Staff — Removing access, Staff — Access not removed, Staff — Invitation not revoked, and Staff — Manager view.

Notes:

1. Public switch: no change needed.
2. Dialog title sizes: not changed; the 14px title is the user's original. Build one dialog component.
3. Staff menu without Owner: kept; listed as Open question 6.
4. Locations View only lanes: fixed (empty 16px chevron slot kept in the header and rows).
5. "Rename" artboard: fixed, now "Settings — Locations — Edit".
6. Sending close ×: fixed (dimmed).
7. Cannot open slug and text: fixed ("chainsawgym"; one line covers missing and failed).
8. Organizations did not load repeat: fixed ("Reload the page to try again.").
9. Inherited values: not changed; they come from the user's originals.
10. Grid: not changed; rows match the other pages.

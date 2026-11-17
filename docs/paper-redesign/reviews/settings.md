# Review: Settings & sign-in

Page "Settings & sign-in" (`p-S-0`). I reviewed 37 new artboards against the
nine originals, the brief, `docs/authorization.md`, and the code
(`TeamSettings.tsx`, `OrganizationSettings.tsx`, `models/team.rb`,
`team_access.rb`, `workos-emulate.config.yaml`, `routes/index.tsx`,
`$org/route.tsx`, `Blocked.tsx`, `AccessUnavailable.tsx`, `Session.tsx`,
`__root.tsx`). I took one screenshot of each frame and read the JSX where I
suspected a fault.

## Findings

### Must fix

1. **Settings — Invite staff — Fewer roles (`2LCT-0`).** Two faults.
   - Daniel is the signed-in user, but his own row in the page behind the
     dialog still has a ⋯ button. The designer reported this; it is real.
     Nobody can change their own role or remove themselves (`Team#manageable!`).
     Remove the ⋯ from Daniel's row.
   - The role list matches neither rule set. In the code, a Manager can grant
     every role whose permissions they hold. The Manager role holds its own
     permissions, so a Manager can grant **Manager** too. The list should show
     Manager, Coach, and Front desk. In Paper's own "Roles" frame (`18UQ-0`),
     a Manager cannot "change settings and staff" at all, so a Manager would
     never open this dialog. Settle the role model first (see Should fix 1).
     Then either show the roles a Manager really holds, or delete this frame
     and draw the Manager's Staff page as the No permission state.
   - A better example of "fewer roles" is a role that lacks a permission held
     by another role. Today only the Owner role has more permissions than a
     Manager, and the Owner choice does not appear in Paper's role cards.

2. **Settings — Staff — Role not changed (`2HEH-0`).** The message "Someone
   else must keep the right to manage staff" cannot be true in this frame.
   Kennedy (Owner) is the actor and keeps staff:manage, so the last-manager
   rule does not fire when he changes Daniel. In practice the actor always
   holds staff:manage and cannot change their own row, so this refusal is
   almost unreachable from the screen. Draw a refusal staff can really hit:
   the membership changed or was removed elsewhere ("Role not changed.
   Daniel's access changed. Reload the page."), or a plain failure ("Role not
   changed. Try again."). Keep the error toast style.

### Should fix

1. **Conflicts in the report: both are real.** I checked them in the code.
   - Role names: `workos-emulate.config.yaml` defines owner, manager, and
     receptionist. `Session.tsx` labels them Owner, Manager, Receptionist.
     Paper uses Owner, Manager, Front desk, Coach. There is no Coach role in
     the app.
   - Manager and staff: the local Manager role holds `staff:manage` and not
     `settings:manage`. So in the app a Manager can invite, change roles,
     revoke, and remove access. Paper's Roles frame says a Manager cannot.
     The new frames follow the app here (Fewer roles) and Paper there (Roles),
     which is the contradiction behind Must fix 1. The user must pick one
     model; then align Fewer roles, No permission, and the Roles frame.

2. **Settings — General — View only (`2C3X-0`).** The Logo row still shows the
   "Replace" link. A view-only role cannot use it. Show the logo tile only.

3. **Settings — General — Saving (`2C73-0`) and Not saved (`2CA9-0`).** The
   Name shows as plain text ("Chainsaw Gym KL") while the save bar says "Name
   changed". In the original, the field being edited is an input. Keep Name as
   the 32px input (not focused) with the new value, so the frame reads as the
   same form mid-save.

4. **Settings — Staff — Role changed (`2H9Z-0`).** The toast "Daniel Wong is
   now Front desk" drops the delay. Open sessions keep old permission claims
   after a role change (`authorization.md`: "The design must account for
   this"). The Remove access dialog already says "This can take a few
   minutes." Add the same short line to the role toast.

5. **Sign in — Something went wrong (`2PK3-0`).** "Nothing you entered was
   lost" is a promise the app cannot keep. An unhandled error can drop unsaved
   form input. Remove that sentence: "The page could not open. Reload to try
   again."

6. **Sign in — Portal start, signed out (`2PFN-0`) next to "Sign in"
   (`17S8-0`).** Together these are two sign-in screens in a row: a card with
   one button, then the original email and password card. That is a second
   version of the sign-in screen. The report raises this as open question 1.
   It needs the user's decision before build. If the original is the WorkOS
   page, the portal start can go straight to WorkOS and the original stays the
   only sign-in screen; keep `2PFN-0` only if the portal must show its own
   button. Mark `2PFN-0` as pending that decision.

7. **Missing states (no frame, no stated reason).**
   - Location saved after an edit: the renamed row and "Location saved" toast.
     The coverage table says Added covers it; Added shows only a new location.
   - Location dialog while saving ("Saving…", buttons dimmed). The app has it.
   - Remove access while removing ("Removing…") and when it fails ("Access was
     not removed").
   - Revoke invitation failed ("The invitation was not revoked").
   - The Staff list as a Manager, outside the dialog: ⋯ only on rows they may
     change. No ⋯ on the Owner row (the Owner holds permissions a Manager
     lacks) and none on their own row. Draw it once the role model is settled.

### Notes

1. **The "Public" switch on Gym site (General frames, e.g. `2C3K-0`).** The
   capability is real: `OrganizationSettings.tsx` has a `published` switch,
   saved with the time zone, behind `settings:manage`. The addition is the
   smallest fitting one: a 12px grey "Public" label and a 32×18 switch at the
   right of the existing Gym site row, all tokens, aligned with the field's
   right edge. It is dimmed in View only. Good. Add it to the original General
   frame when the screen is built, as the report says.

2. **Other additions to original designs.** All fit:
   - The Staff ⋯ menu (Role choices with a check, then "Remove access…" in
     red) uses the original ⋯ button. It opens below the row and does not
     cover the row it belongs to.
   - Lock lines ("View only. …") are plain text with a small icon, as the
     brief asks.
   - The Location dialog is new. It follows `P6M-0` (13px title) while the
     original Invite staff dialog uses a 14px title. Two dialog title sizes on
     one page; the 14px one is the user's original. Leave both, but build one
     dialog component.

3. **Staff menu (`2FJE-0`)** offers Manager, Front desk, and Coach, not Owner.
   In the app an Owner can grant Owner. Confirm whether Paper means one Owner
   only.

4. **Settings — Locations — View only (`2E17-0`).** Removing the chevron lane
   moved the Open hours, Home members, and Staff columns 32px right. Keep the
   empty 32px slot so the lanes match the original.

5. **Settings — Locations — Rename (`2DGT-0`).** The artboard name says
   "Rename"; the dialog and the app say "Edit". Rename the artboard to
   "Settings — Locations — Edit".

6. **Settings — Invite staff — Sending (`2K64-0`).** Cancel is dimmed, but the
   close × still looks active. The app blocks closing while it sends. Dim the
   × too.

7. **Sign in — Cannot open organization (`2PIZ-0`).** The slug "chainsaw"
   does not match the gym site "chainsawgym" in General. Also, the app shows
   this screen for a server failure too; that case needs "Try again", not
   "does not exist". One line can cover both: "This organization did not
   open. It may not exist, or you are not staff there."

8. **Sign in — Organizations did not load (`2PHV-0`).** The title and the
   line say the same thing. Shorten the line to "Reload the page to try
   again."

9. **Inherited values, not faults of this set.** 16px sign-in titles, the
   14px Invite staff title, and the raw `#FFFFFFB3` on the ⌘↵ hint all come
   from the user's originals and were cloned as is.

10. **Grid.** Rows sit at y 1080, 2160, 3240, 4320, 5400. The gaps are 80px,
    but y 1080, 3240, and 5400 are not multiples of 80. Other pages use the
    same row spacing, so leave it unless the user wants a strict grid.

## Checked, nothing found

- Fidelity: every Settings frame is a clone of its original window, sidebar,
  top bar, table, and form. Every sign-in card is a clone of the "Sign in"
  card. No redrawn screens apart from Should fix 6.
- Confirm dialog: "Remove Daniel Wong's access?" matches `TP2-0` (no header
  band, no close, Cancel and a red action).
- Form dialogs: header, body, and footer with Cancel and the action, over the
  dimmed page.
- Result frames: Access removed (4 staff), Invitation revoked (4 staff),
  Invitation sent (new farid row, 6 staff), Location added (new row, 4
  locations), and Settings saved (new name in page, breadcrumb, and sidebar)
  all show the page after the action. Counts match rows.
- Rows a viewer may not act on, apart from Must fix 1: the Owner's own row
  has no ⋯ in every Owner-viewed frame.
- Empty states: "No locations yet…" is one line with the top bar action; no
  icon tile. Only you shows the one row and "1 staff".
- Error text is plain and says what to do. No permission codes, env variable
  names, or developer words in any frame.
- Sign-in row: each real screen in `index.tsx`, `$org/route.tsx`,
  `Blocked.tsx`, `AccessUnavailable.tsx`, and `__root.tsx` has a card. Each
  card has one next step or, for Staff access is turned off, none, as in the
  app. One frame for all four AccessUnavailable reasons is right for staff.
- Text sizes: only 20, 13, and 12px in new content. Font: Figtree only. No raw
  hex in new content.
- No clipped or wrapped text, no overlapping artboards, no menu past the
  window edge.
- Words: no "Deliver". Page names match Paper.
- Coverage reasons: Session expired is true; `$org/route.tsx` redirects
  straight to `/sign-in` with a return address. Remove location is true;
  `routes.rb` has `locations only: create, update`.

## Verdict

Not ready to build from yet, but close. The General, Locations, and sign-in
rows are sound and need only the small fixes above. The Staff and Invite rows
depend on one decision the user must make: which role model wins, and whether
a Manager may manage staff. Until then, "Fewer roles" shows a list that
neither model allows, and "Role not changed" shows a refusal that cannot
happen. Fix the two Must fix items after that decision, add the missing
location and removal states, and settle the two-step sign-in. Then the set is
ready.

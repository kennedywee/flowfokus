import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import type { Result } from "../../lib/result";
import { LockLine, SettingsPage } from "./SettingsPage";
import { ABILITIES, reach } from "./abilities";

const icon = { focusable: false } as const;

/**
 * Paper "Settings — Roles": what each role can do. The columns and the ticks
 * come from the WorkOS roles that Rails returns with the staff list, so the
 * table always matches what the app allows. Only staff who can manage staff
 * receive that list.
 */
export function Roles({ team }: { team: Result<Schemas["Team"]> }) {
  if (!team.ok) {
    return (
      <SettingsPage title="Roles" className="settings-page--wide">
        {team.error.code === "forbidden" ? (
          <LockLine>Seeing roles needs a role that can manage staff.</LockLine>
        ) : (
          <p className="settings-state">
            Roles did not load. Reload the page to try again.
          </p>
        )}
      </SettingsPage>
    );
  }
  const roles = team.data.roles;
  return (
    <SettingsPage title="Roles" className="settings-page--wide">
      <div
        className="settings-roles"
        role="region"
        aria-label="What each role can do"
        tabIndex={0}
      >
        <table className="settings-roles__table">
          <thead>
            <tr>
              <th scope="col">Can</th>
              {roles.map((role) => (
                <th scope="col" key={role.slug}>
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ABILITIES.map((ability) => (
              <tr key={ability.label}>
                <th scope="row">{ability.label}</th>
                {roles.map((role) => {
                  const value = reach(role, ability);
                  return (
                    <td key={role.slug} data-reach={value}>
                      {value === "all" ? (
                        <Icon name="check" {...icon} aria-label="Yes" role="img" />
                      ) : value === "some" ? (
                        "Some"
                      ) : (
                        <Icon name="close" {...icon} aria-label="No" role="img" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsPage>
  );
}

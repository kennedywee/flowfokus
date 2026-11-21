import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "../../components/Toast";
import { failureMessage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { updateOrganization } from "../../lib/staff.functions";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { LockLine, SettingsPage, SettingsRow, SettingsSection } from "./SettingsPage";
import { zoneChoices, zoneLabel } from "./facts";

const sendOrganization = (input: Parameters<typeof updateOrganization>[0]["data"]) => updateOrganization({ data: input });

/**
 * General: the name and currency, which Rails does not let staff change, and
 * the time zone. A new time zone saves when it is chosen.
 */
export function General() {
  const organization = useOrganization();
  const can = useCan();
  const editable = can("settings:manage");
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendOrganization);
  // The choice shows at once, while Rails saves it, and stays until the organization reloads.
  const [timezone, setTimezone] = useState(organization.timezone);
  useEffect(() => setTimezone(organization.timezone), [organization.timezone]);

  async function chooseZone(next: string) {
    if (next === timezone || action.pending) return;
    const before = timezone;
    setTimezone(next);
    const result = await action.run({ slug: organization.slug, timezone: next });
    if (result.ok) {
      setTimezone(result.data.timezone);
      toast.show({ tone: "success", title: `Time zone saved · ${zoneLabel(result.data.timezone)}` });
      void router.invalidate();
    } else {
      setTimezone(before);
      toast.show({ tone: "error", title: "Time zone not saved", body: failureMessage(result.error) });
    }
  }

  return (
    <SettingsPage title="General">
      <SettingsSection title="Gym">
        <SettingsRow title="Name" description="Staff and members see this name.">
          <span className="settings-row__value">{organization.name}</span>
        </SettingsRow>
        <SettingsRow title="Currency" description="Prices and payments use this currency.">
          <span className="settings-row__value">{organization.currency}</span>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Region">
        <SettingsRow
          title="Time zone"
          description="Session times and sale dates use this zone."
          htmlFor={editable ? "org-timezone" : undefined}
        >
          {editable ? (
            <NativeSelect
              id="org-timezone"
              className="settings-select"
              value={timezone}
              disabled={action.pending}
              aria-describedby="org-timezone-description"
              aria-busy={action.pending || undefined}
              onChange={(event) => void chooseZone(event.target.value)}
            >
              {zoneChoices(organization.timezone).map((zone) => (
                <NativeSelectOption key={zone} value={zone}>
                  {zoneLabel(zone)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <span className="settings-row__value">{zoneLabel(organization.timezone)}</span>
          )}
        </SettingsRow>
      </SettingsSection>
      {editable ? null : <LockLine>View only. Changing these needs a role that can change settings.</LockLine>}
    </SettingsPage>
  );
}

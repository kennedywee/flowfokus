import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { useToast } from "../../components/Toast";
import { failureMessage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { updateOrganization } from "../../lib/staff.functions";
import { LockLine, SettingsPage, SettingsRow, SettingsSection } from "./SettingsPage";
import { gymSiteAddress } from "./facts";

const sendOrganization = (input: Parameters<typeof updateOrganization>[0]["data"]) => updateOrganization({ data: input });

/** Gym site: its address and whether it is public. The switch saves at once. */
export function GymSite() {
  const organization = useOrganization();
  const can = useCan();
  const editable = can("settings:manage");
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendOrganization);
  const [pending, setPending] = useState<boolean | null>(null);
  const published = pending ?? organization.published;

  async function publish(next: boolean) {
    if (action.pending) return;
    setPending(next);
    const result = await action.run({ slug: organization.slug, published: next });
    if (result.ok) {
      await router.invalidate();
      toast.show({ tone: "success", title: result.data.published ? "The gym site is public" : "The gym site is hidden" });
    } else {
      toast.show({ tone: "error", title: "Gym site not changed", body: failureMessage(result.error) });
    }
    setPending(null);
  }

  return (
    <SettingsPage title="Gym site">
      <SettingsSection title="Publication">
        <SettingsRow title="Address" description="Members sign in and buy here.">
          <span className="settings-row__value">{gymSiteAddress(organization.slug)}</span>
        </SettingsRow>
        <SettingsRow title="Public" description="Anyone can open the gym site and its shop." htmlFor="gym-site-public">
          <Switch
            id="gym-site-public"
            checked={published}
            disabled={!editable || action.pending}
            aria-describedby="gym-site-public-description"
            onCheckedChange={(value) => void publish(value)}
          />
        </SettingsRow>
      </SettingsSection>
      {editable ? null : <LockLine>View only. Changing these needs a role that can change settings.</LockLine>}
    </SettingsPage>
  );
}

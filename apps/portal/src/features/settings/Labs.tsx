import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Switch } from "@/components/ui/switch";
import { useToast } from "../../components/Toast";
import { failureMessage } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { setLabsFeature } from "../../lib/staff.functions";
import { LockLine, SettingsPage, SettingsRow, SettingsSection } from "./SettingsPage";

/**
 * Labs: the features Flowfokus offers this gym to try. Each switch turns one
 * on or off for the whole organization and saves at once.
 */
export function Labs() {
  const organization = useOrganization();
  const editable = useCan()("settings:manage");
  return (
    <SettingsPage title="Labs">
      <SettingsSection title="Features">
        {organization.labs.map((feature) => (
          <LabsRow key={feature.key} feature={feature} editable={editable} />
        ))}
      </SettingsSection>
      {editable ? null : <LockLine>View only. Changing these needs a role that can change settings.</LockLine>}
    </SettingsPage>
  );
}

function LabsRow({ feature, editable }: { feature: Schemas["LabsFeature"]; editable: boolean }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const [enabled, setEnabled] = useState(feature.enabled);
  const [pending, setPending] = useState(false);
  useEffect(() => setEnabled(feature.enabled), [feature.enabled]);
  const id = `labs-${feature.key}`;

  async function turn(next: boolean) {
    if (pending) return;
    setPending(true);
    setEnabled(next);
    try {
      const result = await setLabsFeature({ data: { slug: organization.slug, key: feature.key, enabled: next } });
      if (result.ok) {
        setEnabled(result.data.enabled);
        toast.show({ tone: "success", title: `${feature.name} turned ${result.data.enabled ? "on" : "off"}` });
        void router.invalidate();
      } else {
        setEnabled(!next);
        toast.show({ tone: "error", title: `${feature.name} not changed`, body: failureMessage(result.error) });
      }
    } catch {
      setEnabled(!next);
      toast.show({ tone: "error", title: `${feature.name} not changed` });
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsRow title={feature.name} description={feature.description} htmlFor={id} tag="Beta">
      <Switch
        id={id}
        checked={enabled}
        disabled={!editable || pending}
        aria-describedby={`${id}-description`}
        onCheckedChange={(value) => void turn(value)}
      />
    </SettingsRow>
  );
}

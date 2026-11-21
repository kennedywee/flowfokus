import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useToast } from "../../components/Toast";
import { failureMessage } from "../../lib/format";
import { useOrganization } from "../../lib/organization";
import type { Result } from "../../lib/result";
import { getDeveloperFeatures, setFeatureState } from "../../lib/staff.functions";
import { SettingsPage, SettingsRow, SettingsSection } from "./SettingsPage";
import { DidNotLoad } from "./Staff";

type DeveloperFeatures = Schemas["DeveloperFeaturesResponse"]["data"];
type FeatureState = Schemas["FeatureState"];

export const FEATURE_STATES: readonly { value: FeatureState; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "labs", label: "Labs" },
  { value: "on", label: "On" },
];

export function featureStateLabel(state: FeatureState): string {
  return FEATURE_STATES.find((choice) => choice.value === state)?.label ?? state;
}

/**
 * Developer, Features: this organization's WorkOS ID and the state of every
 * feature. Only the Developer role holds features:manage, so only it sees
 * the page. A new state saves when it is chosen.
 */
export function Features() {
  const organization = useOrganization();
  const [features, setFeatures] = useState<Result<DeveloperFeatures> | null>(null);
  const load = useCallback(async () => {
    try {
      setFeatures(await getDeveloperFeatures({ data: { slug: organization.slug } }));
    } catch {
      setFeatures({ ok: false, error: { status: 0, code: "invalid_input", message: "" } });
    }
  }, [organization.slug]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!features) {
    return (
      <SettingsPage title="Features">
        <p className="settings-state" role="status">
          Loading features…
        </p>
      </SettingsPage>
    );
  }
  if (!features.ok) {
    return (
      <SettingsPage title="Features">
        <DidNotLoad what="Features" reload={load} />
      </SettingsPage>
    );
  }
  return (
    <SettingsPage title="Features">
      <SettingsSection title="Organization">
        <SettingsRow title="WorkOS organization ID" description="Find this organization in WorkOS.">
          <span className="settings-row__value settings-row__value--code">
            {features.data.workos_organization_id ?? "Not linked"}
          </span>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Features">
        {features.data.features.map((feature) => (
          <FeatureRow key={feature.key} feature={feature} onSaved={(data) => setFeatures({ ok: true, data })} />
        ))}
      </SettingsSection>
    </SettingsPage>
  );
}

function FeatureRow({
  feature,
  onSaved,
}: {
  feature: Schemas["DeveloperFeature"];
  onSaved: (data: DeveloperFeatures) => void;
}) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(feature.state);
  const [pending, setPending] = useState(false);
  useEffect(() => setState(feature.state), [feature.state]);
  const titleId = `feature-${feature.key}-title`;

  async function choose(next: FeatureState) {
    if (next === state || pending) return;
    const before = state;
    setPending(true);
    setState(next);
    try {
      const result = await setFeatureState({ data: { slug: organization.slug, key: feature.key, state: next } });
      if (result.ok) {
        onSaved(result.data);
        toast.show({ tone: "success", title: `${feature.name} · ${featureStateLabel(next)}` });
        void router.invalidate();
      } else {
        setState(before);
        toast.show({ tone: "error", title: `${feature.name} not changed`, body: failureMessage(result.error) });
      }
    } catch {
      setState(before);
      toast.show({ tone: "error", title: `${feature.name} not changed` });
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsRow title={feature.name} description={feature.description} id={titleId}>
      <SegmentedControl
        aria-labelledby={titleId}
        value={state}
        aria-busy={pending || undefined}
        onValueChange={(value) => {
          if (value) void choose(value as FeatureState);
        }}
      >
        {FEATURE_STATES.map((choice) => (
          <SegmentedControlItem key={choice.value} value={choice.value}>
            {choice.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </SettingsRow>
  );
}

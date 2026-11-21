import { useState, type FormEvent } from "react";
import { useBlocker, useRouter } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { SubmitButton } from "../../components/ui";
import { failureMessage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { updateOrganization } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { LockLine, SettingsBand, SettingsPage } from "./SettingsPage";
import { changeSummary, gymSiteAddress, zoneChoices, zoneLabel } from "./facts";

const sendOrganization = (
  input: Parameters<typeof updateOrganization>[0]["data"],
) => updateOrganization({ data: input });

/**
 * Paper "Settings — General", with only what Rails stores: the name and
 * currency (read only), the gym site address and its Public switch, and the
 * time zone. Changes wait in Paper's save bar until Save changes.
 */
export function General() {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const editable = can("settings:manage");
  const action = useAction(sendOrganization);
  const [timezone, setTimezone] = useState(organization.timezone);
  const [published, setPublished] = useState(organization.published);
  const changes = {
    timezone: timezone !== organization.timezone,
    published: published !== organization.published,
  };
  const dirty = changes.timezone || changes.published;

  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  });

  function discard() {
    setTimezone(organization.timezone);
    setPublished(organization.published);
    action.reset();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || action.pending) return;
    const result = await action.run({
      slug: organization.slug,
      timezone,
      published,
    });
    if (result.ok) {
      toast.show({ tone: "success", title: "Settings saved" });
      await router.invalidate();
      setTimezone(result.data.timezone);
      setPublished(result.data.published);
    }
  }

  const address = gymSiteAddress(organization.slug);
  return (
    <SettingsPage title="General">
      <form className="settings-form" onSubmit={onSubmit} noValidate>
        <section className="settings-group" aria-labelledby="settings-gym">
          <SettingsBand title="Gym" id="settings-gym" />
          <div className="settings-row">
            <span className="settings-row__label">Name</span>
            <span className="settings-row__value">{organization.name}</span>
          </div>
          <div className="settings-row">
            <span className="settings-row__label" id="gym-site-label">
              Gym site
            </span>
            <span className="settings-row__value settings-row__value--site">
              <span className="settings-row__address">{address}</span>
              <label className="settings-public" htmlFor="gym-site-public">
                <span className="settings-public__text">Public</span>
                <Switch
                  id="gym-site-public"
                  checked={published}
                  disabled={!editable || action.pending}
                  aria-describedby="gym-site-label"
                  onCheckedChange={(value) => setPublished(value)}
                />
              </label>
            </span>
          </div>
        </section>
        <section className="settings-group" aria-labelledby="settings-region">
          <SettingsBand title="Region" id="settings-region" />
          <div className="settings-row">
            {editable ? (
              <>
                <label className="settings-row__label" htmlFor="org-timezone">
                  Time zone
                </label>
                <span className="settings-row__value">
                  <NativeSelect
                    id="org-timezone"
                    className="settings-select"
                    value={timezone}
                    disabled={action.pending}
                    onChange={(event) => setTimezone(event.target.value)}
                  >
                    {zoneChoices(organization.timezone).map((zone) => (
                      <NativeSelectOption key={zone} value={zone}>
                        {zoneLabel(zone)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </span>
              </>
            ) : (
              <>
                <span className="settings-row__label">Time zone</span>
                <span className="settings-row__value">
                  {zoneLabel(organization.timezone)}
                </span>
              </>
            )}
          </div>
          <div className="settings-row">
            <span className="settings-row__label">Currency</span>
            <span className="settings-row__value">{organization.currency}</span>
          </div>
        </section>
        {!editable ? (
          <LockLine>
            View only. Changing these needs a role that can change settings.
          </LockLine>
        ) : dirty || action.pending ? (
          <div
            className="settings-savebar"
            role="region"
            aria-label="Unsaved changes"
          >
            {action.pending ? (
              <p className="settings-savebar__text" role="status">
                Saving…
              </p>
            ) : action.error ? (
              <p
                className="settings-savebar__text settings-savebar__text--error"
                role="alert"
              >
                <Icon name="notifications"
                  aria-hidden="true"
                  focusable="false"
                />
                Settings were not saved. {failureMessage(action.error)}
              </p>
            ) : (
              <p className="settings-savebar__text" aria-live="polite">
                {changeSummary(changes)}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              size="compact"
              disabled={action.pending}
              onClick={discard}
            >
              Discard
            </Button>
            <SubmitButton
              compact
              pending={action.pending}
              pendingLabel="Saving…"
            >
              Save changes
            </SubmitButton>
          </div>
        ) : null}
        <ConfirmDialog
          open={blocker.status === "blocked"}
          tone="critical"
          title="Discard these changes?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => blocker.proceed?.()}
          onCancel={() => blocker.reset?.()}
        >
          <p>The changes on this page are not saved.</p>
        </ConfirmDialog>
      </form>
    </SettingsPage>
  );
}

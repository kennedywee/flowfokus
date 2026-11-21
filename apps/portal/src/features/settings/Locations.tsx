import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { FormNotice } from "../../components/FormNotice";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { SubmitButton } from "../../components/ui";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { saveLocation } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaleDialog } from "../sales/SaleDialogs";
import { LockLine, SettingsPage } from "./SettingsPage";
import { locationCount, locationFieldError } from "./facts";

const sendLocation = (input: Parameters<typeof saveLocation>[0]["data"]) =>
  saveLocation({ data: input });
const icon = {
  "aria-hidden": true,
  focusable: false,
} as const;

type Location = Schemas["Location"];

/**
 * Paper "Settings — Locations": one row per location with its address. A row
 * opens the edit dialog. Rails stores a name and an address only, and keeps
 * every location, so there is no remove.
 */
export function Locations() {
  const organization = useOrganization();
  const can = useCan();
  const editable = can("settings:manage");
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const locations = organization.locations;

  return (
    <SettingsPage
      title="Locations"
      className="settings-page--wide"
      actions={
        editable ? (
          <PageActions>
            <Button
              type="button"
              size="compact"
              onClick={() => setEditing("new")}
            >
              <Icon name="plus" {...icon} />
              New location
            </Button>
          </PageActions>
        ) : null
      }
    >
      {locations.length === 0 ? (
        <p className="settings-empty">
          No locations yet. Add one before the first sale or check-in.
        </p>
      ) : (
        <section className="settings-table" aria-label="Locations">
          <div
            className="settings-table__head settings-locations__grid"
            aria-hidden="true"
          >
            <span>Location</span>
            <span />
          </div>
          <ul className="settings-rows">
            {locations.map((location) => {
              const body = (
                <>
                  <Icon name="location" className="settings-locations__pin" {...icon} />
                  <span className="settings-row-text">
                    <span className="settings-row-text__name">
                      {location.name}
                    </span>
                    {location.address ? (
                      <span className="settings-row-text__sub">
                        {location.address}
                      </span>
                    ) : null}
                  </span>
                  {/* An empty lane keeps the columns in line when the role cannot edit. */}
                  {editable ? (
                    <Icon name="chevronRight"
                      className="settings-rows__chevron"
                      {...icon}
                    />
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </>
              );
              return (
                <li key={location.id}>
                  {editable ? (
                    <button
                      type="button"
                      className="settings-row-item settings-locations__grid"
                      aria-label={`Edit ${location.name}`}
                      onClick={() => setEditing(location)}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="settings-row-item settings-locations__grid">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="settings-foot">{locationCount(locations.length)}</p>
        </section>
      )}
      {editable ? null : (
        <LockLine>
          View only. Adding and editing locations needs a role that can change
          settings.
        </LockLine>
      )}
      {editing ? (
        <LocationDialog
          location={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </SettingsPage>
  );
}

/** Paper "New location" and "Edit Bangsar": a name and an optional address. */
function LocationDialog({
  location,
  onClose,
}: {
  location?: Location;
  onClose: () => void;
}) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendLocation);
  const [name, setName] = useState(location?.name ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [local, setLocal] = useState<string | undefined>();
  const [sent, setSent] = useState("");
  const server =
    action.error?.code === "validation_failed"
      ? action.error.details
      : undefined;
  const nameError = local ?? locationFieldError(server?.name, "Name", sent);
  const addressError = locationFieldError(server?.address, "Address", sent);

  async function submit() {
    if (!name.trim()) {
      setLocal("Enter a name, for example Bangsar");
      return;
    }
    setLocal(undefined);
    setSent(name);
    const result = await action.run({
      slug: organization.slug,
      ...(location ? { id: location.id } : {}),
      name: name.trim(),
      address: address.trim() || null,
    });
    if (result.ok) {
      toast.show({
        tone: "success",
        title: `${location ? "Location saved" : "Location added"} · ${result.data.name}`,
      });
      onClose();
      void router.invalidate();
    }
  }

  return (
    <SaleDialog
      title={location ? `Edit ${location.name}` : "New location"}
      className="settings-dialog"
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={() => (
        <SubmitButton compact pending={action.pending} pendingLabel="Saving…">
          {location ? "Save location" : "Add location"}
        </SubmitButton>
      )}
    >
      <div className="settings-field">
        <label className="settings-field__label" htmlFor="location-name">
          Name
        </label>
        <Input
          id="location-name"
          className="settings-input"
          value={name}
          maxLength={100}
          autoFocus
          disabled={action.pending}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "location-name-error" : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {nameError ? (
          <FieldError id="location-name-error">{nameError}</FieldError>
        ) : null}
      </div>
      <div className="settings-field">
        <label className="settings-field__label" htmlFor="location-address">
          Address <span className="settings-field__optional">Optional</span>
        </label>
        <Input
          id="location-address"
          className="settings-input"
          value={address}
          maxLength={300}
          placeholder="Street, city"
          disabled={action.pending}
          aria-invalid={addressError ? true : undefined}
          aria-describedby={addressError ? "location-address-error" : undefined}
          onChange={(event) => setAddress(event.target.value)}
        />
        {addressError ? (
          <FieldError id="location-address-error">{addressError}</FieldError>
        ) : null}
      </div>
      {action.error && action.error.code !== "validation_failed" ? (
        <FormNotice title="The location was not saved" error={action.error} />
      ) : null}
    </SaleDialog>
  );
}

/** Paper's field error: a small red icon and one line under the field. */
export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="settings-field__error">
      <Icon name="notifications" aria-hidden="true" focusable="false" />
      {children}
    </p>
  );
}

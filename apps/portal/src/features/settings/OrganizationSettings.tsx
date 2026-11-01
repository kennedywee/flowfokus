import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { MapPin, Pencil, Plus, Save } from "lucide-react";
import { useToast } from "../../components/Toast";
import { Empty, FailureNotice, Field, Plate, SubmitButton, describedBy } from "../../components/ui";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { saveLocation, updateOrganization } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sendOrganization = (input: Parameters<typeof updateOrganization>[0]["data"]) => updateOrganization({ data: input });
const sendLocation = (input: Parameters<typeof saveLocation>[0]["data"]) => saveLocation({ data: input });

/** A fixed list, so the server and the browser render the same options. */
const TIME_ZONES = [
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Manila",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "UTC",
];

export function OrganizationDetails() {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const editable = can("settings:manage");
  const action = useAction(sendOrganization);
  const [timezone, setTimezone] = useState(organization.timezone);
  const [published, setPublished] = useState(organization.published);
  const dirty = timezone !== organization.timezone || published !== organization.published;
  const zones = TIME_ZONES.includes(organization.timezone) ? TIME_ZONES : [organization.timezone, ...TIME_ZONES];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await action.run({ slug: organization.slug, timezone, published });
    if (result.ok) {
      toast.show({
        tone: "success",
        title: "Settings saved",
        body: result.data.published ? "The gym site is public." : "The gym site is hidden from the public.",
      });
      void router.invalidate();
    }
  }

  return (
    <Plate title="Organization details" description="Times show in this time zone. The gym site shows only when published.">
      <form className="form" onSubmit={onSubmit} noValidate>
        {action.error ? <FailureNotice error={action.error} title="Settings were not saved" /> : null}
        <div className="grid-2">
          <Field id="org-name" label="Name" hint="Managed in WorkOS. Changes there sync here.">
            <Input id="org-name" value={organization.name} readOnly aria-describedby={describedBy("org-name", "hint")} />
          </Field>
          <Field id="org-currency" label="Currency" hint="Fixed. Prices and sales are recorded in it.">
            <Input id="org-currency" value={organization.currency} readOnly aria-describedby={describedBy("org-currency", "hint")} />
          </Field>
        </div>
        <Field id="org-timezone" label="Time zone">
          <NativeSelect id="org-timezone" value={timezone} disabled={!editable} onChange={(event) => setTimezone(event.target.value)}>
            {zones.map((zone) => (
              <NativeSelectOption key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="settings-switch">
          <Switch id="org-published" checked={published} disabled={!editable} onCheckedChange={(value) => setPublished(value)} />
          <label htmlFor="org-published">Publish the gym site at {organization.slug}.flowfokus.com</label>
        </div>
        {editable ? (
          <div className="actions actions--end">
            <span className="muted">{dirty ? "Unsaved changes" : "No unsaved changes"}</span>
            <SubmitButton pending={action.pending} pendingLabel="Saving…" disabled={!dirty}>
              <Save aria-hidden="true" />
              Save changes
            </SubmitButton>
          </div>
        ) : (
          <p className="muted">Your role can view these settings but not change them.</p>
        )}
      </form>
    </Plate>
  );
}

export function Locations() {
  const organization = useOrganization();
  const can = useCan();
  const editable = can("settings:manage");
  const [editing, setEditing] = useState<Schemas["Location"] | "new" | null>(null);

  return (
    <Plate
      title="Locations"
      description="Branches where staff sell and check members in. Locations keep their history, so they cannot be removed."
      flush
      action={
        editable ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Add location
          </Button>
        ) : undefined
      }
    >
      {organization.locations.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Address</TableHead>
              {editable ? (
                <TableHead scope="col">
                  <span className="visually-hidden">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {organization.locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="cell-title">{location.name}</TableCell>
                <TableCell className="muted">{location.address ?? "No address"}</TableCell>
                {editable ? (
                  <TableCell className="cell-actions">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(location)}>
                      <Pencil aria-hidden="true" />
                      Edit<span className="visually-hidden"> {location.name}</span>
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="settings-state">
          <Empty title="No locations yet" icon={MapPin}>
            <p>Add a location before the first sale or check-in.</p>
          </Empty>
        </div>
      )}
      {editing ? <LocationDialog location={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </Plate>
  );
}

function LocationDialog({ location, onClose }: { location?: Schemas["Location"]; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendLocation);
  const [name, setName] = useState(location?.name ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [local, setLocal] = useState<string | undefined>();
  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const nameError = local ?? server?.name?.join(" ");
  const addressError = server?.address?.join(" ");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setLocal("Enter a name, for example Bangsar.");
      return;
    }
    setLocal(undefined);
    const result = await action.run({
      slug: organization.slug,
      ...(location ? { id: location.id } : {}),
      name: name.trim(),
      address: address.trim() || null,
    });
    if (result.ok) {
      toast.show({ tone: "success", title: location ? "Location saved" : "Location added", body: result.data.name });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(value) => !value && !action.pending && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>{location ? `Edit ${location.name}` : "Add location"}</DialogTitle>
            {action.error && action.error.code !== "validation_failed" ? (
              <FailureNotice error={action.error} title="The location was not saved" />
            ) : null}
            <div className="form">
              <Field id="location-name" label="Name" error={nameError}>
                <Input
                  id="location-name"
                  value={name}
                  maxLength={100}
                  autoFocus
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={describedBy("location-name", undefined, nameError)}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field id="location-address" label="Address" hint="Optional. Shown on the gym site." error={addressError}>
                <Input
                  id="location-address"
                  value={address}
                  maxLength={300}
                  aria-describedby={describedBy("location-address", "hint", addressError)}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Saving…">
              {location ? "Save location" : "Add location"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

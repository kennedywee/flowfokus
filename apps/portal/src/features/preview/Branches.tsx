import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Building2, Clock, MapPin, Pencil, Plus, Users } from "lucide-react";
import { Field, Pill, Plate, buttonClass } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { useOrganization } from "../../lib/organization";
import { PreviewDialog, PreviewPage } from "./shared";

interface Branch {
  id: string;
  name: string;
  address: string;
  hours: string;
  manager: string;
  capacity: number;
}
export function Branches() {
  const organization = useOrganization();
  const hash = useRouterState({ select: (state) => state.location.hash });
  const toast = useToast();
  const [branches, setBranches] = useState<Branch[]>(() =>
    organization.locations.map((location, index) => ({
      id: location.id,
      name: location.name,
      address: location.address ?? "No address set",
      hours: "06:00–23:00",
      manager: index === 0 ? "Nadia Hassan" : "Daniel Koh",
      capacity: index === 0 ? 80 : 60,
    })),
  );
  const [selected, setSelected] = useState(branches[0]?.id ?? "");
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  useEffect(() => {
    if (hash?.startsWith("branch-")) setSelected(hash.slice(7));
  }, [hash]);
  const current = branches.find((branch) => branch.id === selected) ?? branches[0];
  return (
    <PreviewPage
      title="Branches"
      description="One organization. A clear view of every location."
      actions={
        <button type="button" className={buttonClass()} onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" />
          Add branch
        </button>
      }
    >
      <div className="preview-branches">
        <aside className="preview-branch-list" aria-label="Choose a branch">
          <div className="preview-panel-head">
            <h2>Locations</h2>
            <span className="preview-count">{branches.length}</span>
          </div>
          {branches.map((branch) => (
            <button
              type="button"
              key={branch.id}
              aria-pressed={current?.id === branch.id}
              onClick={() => setSelected(branch.id)}
            >
              <span className="preview-branch-icon">
                <Building2 aria-hidden="true" />
              </span>
              <span>
                <strong>{branch.name}</strong>
                <small>Kuala Lumpur</small>
              </span>
              <span className="preview-live-dot" aria-hidden="true" />
            </button>
          ))}
        </aside>
        {current ? (
          <div className="stack" id={`branch-${current.id}`}>
            <Plate
              title={current.name}
              description="Location details and front-desk setup."
              icon={<Building2 />}
              action={
                <button
                  type="button"
                  className={buttonClass({ variant: "secondary", size: "small" })}
                  onClick={() => setEditing(current)}
                >
                  <Pencil aria-hidden="true" />
                  Edit details
                </button>
              }
            >
              <Pill tone="good">Active location</Pill>
              <dl className="preview-branch-details">
                <div>
                  <dt>
                    <MapPin aria-hidden="true" />
                    Address
                  </dt>
                  <dd>{current.address}</dd>
                </div>
                <div>
                  <dt>
                    <Clock aria-hidden="true" />
                    Opening hours
                  </dt>
                  <dd>Every day · {current.hours}</dd>
                </div>
                <div>
                  <dt>
                    <Users aria-hidden="true" />
                    Branch manager
                  </dt>
                  <dd>{current.manager}</dd>
                </div>
                <div>
                  <dt>
                    <Building2 aria-hidden="true" />
                    Capacity
                  </dt>
                  <dd>{current.capacity} members at a time</dd>
                </div>
              </dl>
            </Plate>
            <Plate title="A day at this location" description="Sample activity, ready for the real data later.">
              <div className="preview-branch-stats">
                <div>
                  <span>Visits today</span>
                  <strong>{current.id === branches[0]?.id ? 42 : 28}</strong>
                </div>
                <div>
                  <span>At the gym now</span>
                  <strong>{current.id === branches[0]?.id ? 16 : 11}</strong>
                </div>
                <div>
                  <span>Desk team</span>
                  <strong>3</strong>
                </div>
              </div>
            </Plate>
            <div className="preview-branch-note">
              <MapPin aria-hidden="true" />
              <p>
                Locations come from your organization. Activity and editing use sample data until their APIs are available.
              </p>
            </div>
          </div>
        ) : (
          <Plate title="No branches yet">
            <p>Add a sample branch to try the layout.</p>
          </Plate>
        )}
      </div>
      {editing ? (
        <PreviewDialog title={editing === "new" ? "Add branch" : "Edit branch"} onClose={() => setEditing(null)}>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const id = editing === "new" ? `sample-${branches.length + 1}` : editing.id;
              const branch = {
                id,
                name: String(data.get("name")).trim(),
                address: String(data.get("address")).trim(),
                manager: String(data.get("manager")).trim(),
                hours: String(data.get("hours")),
                capacity: Number(data.get("capacity")),
              };
              setBranches((items) =>
                editing === "new" ? [...items, branch] : items.map((item) => (item.id === id ? branch : item)),
              );
              setSelected(id);
              setEditing(null);
              toast.show({
                tone: "success",
                title: "Sample branch saved",
                body: "This preview resets when you leave the page.",
              });
            }}
          >
            <Field id="branch-name" label="Branch name">
              <input
                className="input"
                id="branch-name"
                name="name"
                defaultValue={editing === "new" ? "" : editing.name}
                required
                autoFocus
                maxLength={100}
              />
            </Field>
            <Field id="branch-address" label="Address">
              <input
                className="input"
                id="branch-address"
                name="address"
                defaultValue={editing === "new" ? "" : editing.address}
                required
              />
            </Field>
            <Field id="branch-manager" label="Branch manager">
              <input
                className="input"
                id="branch-manager"
                name="manager"
                defaultValue={editing === "new" ? "" : editing.manager}
                required
              />
            </Field>
            <div className="grid-2">
              <Field id="branch-hours" label="Opening hours">
                <input
                  className="input"
                  id="branch-hours"
                  name="hours"
                  defaultValue={editing === "new" ? "06:00–23:00" : editing.hours}
                  required
                />
              </Field>
              <Field id="branch-capacity" label="Capacity">
                <input
                  className="input"
                  id="branch-capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  max={1000}
                  defaultValue={editing === "new" ? 60 : editing.capacity}
                  required
                />
              </Field>
            </div>
            <div className="preview-form-actions">
              <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className={buttonClass()}>
                Save sample branch
              </button>
            </div>
          </form>
        </PreviewDialog>
      ) : null}
    </PreviewPage>
  );
}

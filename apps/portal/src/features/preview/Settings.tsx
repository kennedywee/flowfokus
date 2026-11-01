import { useState } from "react";
import { Mail, MessageCircle, QrCode, UserPlus } from "lucide-react";
import { Avatar, Field, Pill, Plate } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { Locations, OrganizationDetails } from "../settings/OrganizationSettings";
import { Filters, PreviewDialog, PreviewPage, Toggle } from "./shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const initialTeam = [
  { name: "Nadia Hassan", email: "nadia@example.com", role: "Owner", status: "Active" },
  { name: "Aina Zulkifli", email: "aina@example.com", role: "Front desk", status: "Active" },
  { name: "Daniel Koh", email: "daniel@example.com", role: "Manager", status: "Active" },
];
const integrations = [
  { name: "DuitNow QR", detail: "Payment references and QR collection", icon: QrCode },
  { name: "WhatsApp reminders", detail: "Membership and payment follow-ups", icon: MessageCircle },
  { name: "Email receipts", detail: "A copy of each recorded payment", icon: Mail },
];

export const SETTINGS_SECTIONS = ["Organization", "Locations", "Team", "Notifications", "Integrations"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function Settings({ section, onSection }: { section: SettingsSection; onSection: (section: SettingsSection) => void }) {
  const toast = useToast();
  const [notifications, setNotifications] = useState({ expiry: true, due: true, denied: false, summary: true });
  const [connected, setConnected] = useState(["Email receipts"]);
  const [team, setTeam] = useState(initialTeam);
  const [inviting, setInviting] = useState(false);
  const sample = section === "Team" || section === "Notifications" || section === "Integrations";
  return (
    <PreviewPage
      title="Settings"
      description="The details that keep your gym running."
      sample={sample}
    >
      <div className="stack">
        <Filters values={[...SETTINGS_SECTIONS]} value={section} onChange={onSection} label="Settings section" />
        {section === "Organization" ? <OrganizationDetails /> : null}
        {section === "Locations" ? <Locations /> : null}
        {section === "Team" ? (
          <Plate
            title="Your team"
            description="People who can work in this organization."
            action={
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setInviting(true)}
              >
                <UserPlus aria-hidden="true" />
                Invite staff
              </Button>
            }
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Staff member</TableHead>
                  <TableHead scope="col">Role</TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((person, index) => (
                  <TableRow key={person.email}>
                    <TableCell>
                      <div className="preview-person">
                        <Avatar name={person.name} />
                        <div>
                          <strong>{person.name}</strong>
                          <p>{person.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {person.role === "Owner" ? (
                        "Owner"
                      ) : (
                        <NativeSelect
                          className="input--small"
                          aria-label={`Role for ${person.name}`}
                          value={person.role}
                          onChange={(e) =>
                            setTeam((items) =>
                              items.map((item, i) => (i === index ? { ...item, role: e.target.value } : item)),
                            )
                          }
                        >
                          <NativeSelectOption>Front desk</NativeSelectOption>
                          <NativeSelectOption>Manager</NativeSelectOption>
                        </NativeSelect>
                      )}
                    </TableCell>
                    <TableCell>
                      <Pill tone={person.status === "Active" ? "good" : "warning"}>{person.status}</Pill>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Plate>
        ) : null}
        {section === "Notifications" ? (
          <Plate title="Desk notifications" description="Choose what appears in your Inbox.">
            <Toggle
              label="Membership ending soon"
              description="A reminder before a member’s access ends."
              checked={notifications.expiry}
              onChange={(expiry) => setNotifications((value) => ({ ...value, expiry }))}
            />
            <Toggle
              label="Unpaid balances"
              description="Follow up on sales that still need payment."
              checked={notifications.due}
              onChange={(due) => setNotifications((value) => ({ ...value, due }))}
            />
            <Toggle
              label="Denied check-ins"
              description="See when a member needs help getting access."
              checked={notifications.denied}
              onChange={(denied) => setNotifications((value) => ({ ...value, denied }))}
            />
            <Toggle
              label="Daily desk summary"
              description="A short recap of payments and visits."
              checked={notifications.summary}
              onChange={(summary) => setNotifications((value) => ({ ...value, summary }))}
            />
          </Plate>
        ) : null}
        {section === "Integrations" ? (
          <Plate
            title="Connected tools"
            description="Try the connection states. No external account will be connected."
            flush
          >
            <div className="preview-integrations">
              {integrations.map(({ name, detail, icon: Icon }) => {
                const active = connected.includes(name);
                return (
                  <div className="preview-integration" key={name}>
                    <span className="preview-integration__icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{name}</strong>
                      <p>{detail}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setConnected((items) => (active ? items.filter((item) => item !== name) : [...items, name]))
                      }
                    >
                      {active ? "Disconnect" : "Connect"}
                    </Button>
                    <Pill tone={active ? "good" : "neutral"}>{active ? "Connected" : "Not connected"}</Pill>
                  </div>
                );
              })}
            </div>
          </Plate>
        ) : null}
        {sample ? (
          <p className="preview-footnote">
            Sample settings only. No invitations, notifications, or external connections are sent. Changes reset when you
            leave this page.
          </p>
        ) : null}
      </div>
      {inviting ? (
        <PreviewDialog title="Invite a team member" onClose={() => setInviting(false)}>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const email = String(data.get("email")).trim();
              if (team.some((person) => person.email.toLowerCase() === email.toLowerCase())) {
                toast.show({ tone: "error", title: "This person is already on the team" });
                return;
              }
              setTeam((items) => [
                ...items,
                { name: String(data.get("name")).trim(), email, role: String(data.get("role")), status: "Pending" },
              ]);
              setInviting(false);
              toast.show({ tone: "info", title: "Sample invitation added", body: "No email was sent." });
            }}
          >
            <Field id="invite-name" label="Full name">
              <Input id="invite-name" name="name" required autoFocus />
            </Field>
            <Field id="invite-email" label="Email">
              <Input id="invite-email" name="email" type="email" required />
            </Field>
            <Field id="invite-role" label="Role">
              <NativeSelect id="invite-role" name="role">
                <NativeSelectOption>Front desk</NativeSelectOption>
                <NativeSelectOption>Manager</NativeSelectOption>
              </NativeSelect>
            </Field>
            <div className="preview-form-actions">
              <Button variant="ghost" type="button" onClick={() => setInviting(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add sample invitation
              </Button>
            </div>
          </form>
        </PreviewDialog>
      ) : null}
    </PreviewPage>
  );
}

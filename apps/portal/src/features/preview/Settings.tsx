import { useState } from "react";
import { Mail, MessageCircle, QrCode } from "lucide-react";
import { Pill, Plate } from "../../components/ui";
import { useToast } from "../../components/Toast";
import type { Schemas } from "@flowfokus/api";
import type { Result } from "../../lib/result";
import { Locations, OrganizationDetails } from "../settings/OrganizationSettings";
import { TeamSettings } from "../settings/TeamSettings";
import { Filters, PreviewPage, Toggle } from "./shared";
import { Button } from "@/components/ui/button";

const integrations = [
  { name: "DuitNow QR", detail: "Payment references and QR collection", icon: QrCode },
  { name: "WhatsApp reminders", detail: "Membership and payment follow-ups", icon: MessageCircle },
  { name: "Email receipts", detail: "A copy of each recorded payment", icon: Mail },
];

export const SETTINGS_SECTIONS = ["Organization", "Locations", "Team", "Notifications", "Integrations"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function Settings({
  section,
  onSection,
  team,
}: {
  section: SettingsSection;
  onSection: (section: SettingsSection) => void;
  team: Result<Schemas["Team"]> | null;
}) {
  const toast = useToast();
  const [notifications, setNotifications] = useState({ expiry: true, due: true, denied: false, summary: true });
  const [connected, setConnected] = useState(["Email receipts"]);
  const sample = section === "Notifications" || section === "Integrations";
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
        {section === "Team" ? <TeamSettings team={team} /> : null}
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
            Sample settings only. No notifications or external connections are sent. Changes reset when you
            leave this page.
          </p>
        ) : null}
      </div>
    </PreviewPage>
  );
}

import { useState } from "react";
import { Mail, MessageCircle, QrCode } from "lucide-react";
import { Pill } from "../../components/ui";
import { SettingsPage } from "../settings/SettingsPage";
import { Toggle } from "./shared";
import { Button } from "@/components/ui/button";

/*
 * Sample settings. Nothing here is saved or sent: Rails has no notification
 * or integration settings yet. They sit after the real sections, under
 * "Samples", and say so on the page.
 */

const integrations = [
  { name: "DuitNow QR", icon: QrCode },
  { name: "WhatsApp reminders", icon: MessageCircle },
  { name: "Email receipts", icon: Mail },
];

function SampleNote() {
  return <p className="preview-footnote">Sample settings only. Nothing is saved or sent. Changes reset when you leave this page.</p>;
}

export function NotificationsSample() {
  const [notifications, setNotifications] = useState({ expiry: true, due: true, denied: false, summary: true });
  return (
    <SettingsPage title="Notifications" facts={<Pill>Sample data</Pill>}>
      <div className="settings-sample">
        <Toggle
          label="Membership ending soon"
          checked={notifications.expiry}
          onChange={(expiry) => setNotifications((value) => ({ ...value, expiry }))}
        />
        <Toggle label="Unpaid balances" checked={notifications.due} onChange={(due) => setNotifications((value) => ({ ...value, due }))} />
        <Toggle
          label="Denied check-ins"
          checked={notifications.denied}
          onChange={(denied) => setNotifications((value) => ({ ...value, denied }))}
        />
        <Toggle
          label="Daily desk summary"
          checked={notifications.summary}
          onChange={(summary) => setNotifications((value) => ({ ...value, summary }))}
        />
      </div>
      <SampleNote />
    </SettingsPage>
  );
}

export function IntegrationsSample() {
  const [connected, setConnected] = useState(["Email receipts"]);
  return (
    <SettingsPage title="Integrations" facts={<Pill>Sample data</Pill>}>
      <div className="preview-integrations settings-sample">
        {integrations.map(({ name, icon: Icon }) => {
          const active = connected.includes(name);
          return (
            <div className="preview-integration" key={name}>
              <span className="preview-integration__icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <strong>{name}</strong>
              </div>
              <Button
                variant="secondary"
                size="compact"
                type="button"
                aria-pressed={active}
                onClick={() => setConnected((items) => (active ? items.filter((item) => item !== name) : [...items, name]))}
              >
                {active ? "Disconnect" : "Connect"}
              </Button>
              <Pill tone={active ? "good" : "neutral"}>{active ? "Connected" : "Not connected"}</Pill>
            </div>
          );
        })}
      </div>
      <SampleNote />
    </SettingsPage>
  );
}

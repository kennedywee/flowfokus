import { useState } from "react";
import { Pill } from "../../components/ui";
import { SettingsPage } from "../settings/SettingsPage";
import { Toggle } from "./shared";

/*
 * Sample settings. Nothing here is saved or sent: Rails has no notification
 * settings yet. They sit after the real sections, under "Samples", and say
 * so on the page.
 */

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

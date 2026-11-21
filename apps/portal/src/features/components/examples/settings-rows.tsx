import { useState } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  LockLine,
  SettingsPage,
  SettingsPageAction,
  SettingsRow,
  SettingsSection,
} from "@/features/settings/SettingsPage";

// Sample values. In the app each row shows what Rails returns.
export default function Example() {
  const [zone, setZone] = useState("Asia/Kuala_Lumpur");
  const [open, setOpen] = useState(true);
  const [trying, setTrying] = useState(false);
  return (
    <div className="gallery-fill settings-dialog__column">
      <SettingsPage title="General" action={<SettingsPageAction onClick={() => {}}>New location</SettingsPageAction>}>
        <SettingsSection title="Gym">
          <SettingsRow title="Name" description="Staff and members see this name.">
            <span className="settings-row__value">Chainsaw</span>
          </SettingsRow>
          <SettingsRow title="Public" description="Anyone can open the gym site and its shop." htmlFor="example-public">
            <Switch id="example-public" checked={open} onCheckedChange={setOpen} />
          </SettingsRow>
          <SettingsRow title="Gym site" description="Public pages, the shop, and the member area." htmlFor="example-labs" tag="Beta">
            <Switch id="example-labs" checked={trying} onCheckedChange={setTrying} />
          </SettingsRow>
        </SettingsSection>
        <SettingsSection title="Region">
          <SettingsRow title="Time zone" description="Session times and sale dates use this zone." htmlFor="example-zone">
            <NativeSelect id="example-zone" className="settings-select" value={zone} onChange={(event) => setZone(event.target.value)}>
              <NativeSelectOption value="Asia/Kuala_Lumpur">Kuala Lumpur (GMT+8)</NativeSelectOption>
              <NativeSelectOption value="Asia/Singapore">Singapore (GMT+8)</NativeSelectOption>
            </NativeSelect>
          </SettingsRow>
        </SettingsSection>
        <LockLine>View only. Changing these needs a role that can change settings.</LockLine>
      </SettingsPage>
    </div>
  );
}

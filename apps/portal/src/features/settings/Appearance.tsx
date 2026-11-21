import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { THEME_CHOICES, useThemeChoice } from "../../lib/use-theme-choice";
import type { Theme } from "../../lib/validate";
import { SettingsPage, SettingsRow, SettingsSection } from "./SettingsPage";

/** Appearance: the theme for this browser. The account menu has the same choice. */
export function Appearance() {
  const { theme, choose } = useThemeChoice();
  return (
    <SettingsPage title="Appearance">
      <SettingsSection title="Theme">
        <SettingsRow title="Theme" description="System follows your device." htmlFor="settings-theme">
          <NativeSelect
            id="settings-theme"
            className="settings-select"
            value={theme}
            aria-describedby="settings-theme-description"
            onChange={(event) => void choose(event.target.value as Theme)}
          >
            {THEME_CHOICES.map((choice) => (
              <NativeSelectOption key={choice.value} value={choice.value}>
                {choice.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </SettingsRow>
      </SettingsSection>
    </SettingsPage>
  );
}

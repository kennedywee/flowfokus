import { useId } from "react";
import { Switch } from "@/components/ui/switch";

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="preview-setting">
      <div>
        <label htmlFor={id}>{label}</label>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={(next) => onChange(next)} />
    </div>
  );
}

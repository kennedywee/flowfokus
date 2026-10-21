import { useId, type ReactNode } from "react";
import { PageHead, Pill } from "../../components/ui";
import { Dialog, DialogBody, DialogContent, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function PreviewPage({
  title,
  description,
  actions,
  sample = true,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  sample?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="page preview-page">
      <PageHead title={title} description={description}>
        {sample ? <Pill>Sample data</Pill> : null}
        {actions}
      </PageHead>
      {children}
    </div>
  );
}

/** A filter row. One choice stays pressed; the arrow keys move between choices. */
export function Filters<T extends string>({
  values,
  value,
  onChange,
  label,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <ToggleGroup
      className="preview-filters"
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        // A press on the current choice would clear it. Keep one choice pressed.
        const picked = next[0] as T | undefined;
        if (picked) onChange(picked);
      }}
    >
      {values.map((item) => (
        <ToggleGroupItem key={item} value={item}>
          {item}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="preview-setting">
      <div>
        <label htmlFor={id}>{label}</label>
        <p id={`${id}-help`}>{description}</p>
      </div>
      <Switch id={id} aria-describedby={`${id}-help`} checked={checked} onCheckedChange={(next) => onChange(next)} />
    </div>
  );
}

/** A sample form in a dialog. Mount it to open it; `onClose` asks the parent to unmount it. */
export function PreviewDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useRestoreFocus();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="preview-dialog">
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          {children}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

import { useId, type ReactNode } from "react";
import { PageHead, Pill } from "../../components/ui";
import { Dialog, DialogBody, DialogContent, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";

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

/** A simple filter group. Native buttons retain standard keyboard behavior. */
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
    <div className="preview-filters" role="group" aria-label={label}>
      {values.map((item) => (
        <button key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)}>
          {item}
        </button>
      ))}
    </div>
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
      <input
        id={id}
        className="preview-switch"
        type="checkbox"
        role="switch"
        aria-describedby={`${id}-help`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
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

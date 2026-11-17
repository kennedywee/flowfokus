import { useId, type ReactNode } from "react";
import { PageHead, Pill } from "../../components/ui";
import { Dialog, DialogBody, DialogContent, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export function PreviewPage({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <PageHead title={title} actions={actions}>
        <Pill>Sample data</Pill>
      </PageHead>
      {children}
    </div>
  );
}

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

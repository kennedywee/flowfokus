import { useEffect, useId, useRef, type ReactNode } from "react";
import { PageHead, Pill } from "../../components/ui";

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

export function PreviewDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog preview-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog__body">
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

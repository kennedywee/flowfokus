import type { ReactNode } from "react";
import { failureMessage, formatDateTime, formatMoney } from "../lib/format";
import type { Failure } from "../lib/result";

export type LampState = "off" | "granted" | "denied" | "paid" | "due" | "waiting" | "delivered" | "active" | "error";

export function Lamp({ state }: { state: LampState }) {
  return <span className="lamp" data-state={state} aria-hidden="true" />;
}

export function Status({ state, children }: { state: LampState; children: ReactNode }) {
  return (
    <span className="status">
      <Lamp state={state} />
      {children}
    </span>
  );
}

export function Money({ minor, currency }: { minor: number; currency: string }) {
  return <span className="money">{formatMoney(minor, currency)}</span>;
}

/** A time shown in the organization's time zone. */
export function Time({ iso, timeZone }: { iso: string; timeZone: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatDateTime(iso, timeZone)}
    </time>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  live = false,
}: {
  tone?: "info" | "error" | "warning" | "success";
  title: string;
  children?: ReactNode;
  live?: boolean;
}) {
  const lamp: LampState = tone === "error" ? "error" : tone === "warning" ? "due" : tone === "success" ? "granted" : "off";
  return (
    <div className="notice" data-tone={tone} role={live ? (tone === "error" ? "alert" : "status") : undefined}>
      <Lamp state={lamp} />
      <p className="notice__title">{title}</p>
      {children ? <div className="notice__body">{children}</div> : null}
    </div>
  );
}

/** A failed call, with the reason and what to do next. */
export function FailureNotice({ error, title = "That did not work" }: { error: Failure; title?: string }) {
  return (
    <Notice tone="error" title={title} live>
      <p>{failureMessage(error)}</p>
    </Notice>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children}
    </div>
  );
}

export function Plate({
  title,
  description,
  action,
  children,
  labelledBy,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  labelledBy?: string;
}) {
  const id = labelledBy ?? `plate-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="plate" aria-labelledby={id}>
      <div className="plate__head">
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
        {action}
      </div>
      <div className="plate__body">{children}</div>
    </section>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-describedby` for a field with an optional hint and error. */
export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  disabled = false,
  large = false,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  disabled?: boolean;
  large?: boolean;
}) {
  return (
    <button
      type="submit"
      className={large ? "button button--large" : "button"}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="skeleton-rows">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton" style={{ width: `${88 - index * 9}%` }} />
      ))}
    </div>
  );
}

export function PageHead({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </header>
  );
}

export { formatDateTime };

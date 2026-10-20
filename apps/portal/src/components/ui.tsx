import type { CSSProperties, ReactNode } from "react";
import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Info,
  Inbox,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { failureMessage, formatDateTime, formatMoney } from "../lib/format";
import type { Failure } from "../lib/result";

/*
 * Shared UI parts for the staff portal. Styles live in styles/components.css.
 *
 * Exports: Lamp, Status, Pill, Money, Time, Notice, FailureNotice, Empty,
 * ErrorState, LoadingState, Plate (and Card, an alias), Field, describedBy,
 * SubmitButton, buttonClass, SkeletonRows, PageHead, Avatar, initials,
 * Wordmark, formatDateTime. Added in the restyle: Pill, ErrorState, LoadingState,
 * Card, buttonClass, Avatar, initials, Wordmark.
 */

export type LampState = "off" | "granted" | "denied" | "paid" | "due" | "waiting" | "delivered" | "active" | "error";

/** The tone of a pill. Each tone has a wash and an icon in the Paper kit. */
export type PillTone = "good" | "warning" | "critical" | "info" | "neutral";

const LAMP: Record<LampState, { icon: LucideIcon; tone: PillTone }> = {
  off: { icon: Circle, tone: "neutral" },
  granted: { icon: CircleCheck, tone: "good" },
  paid: { icon: CircleCheck, tone: "good" },
  delivered: { icon: CircleCheck, tone: "good" },
  active: { icon: CircleCheck, tone: "good" },
  denied: { icon: CircleX, tone: "critical" },
  error: { icon: CircleX, tone: "critical" },
  due: { icon: CircleAlert, tone: "warning" },
  waiting: { icon: Clock, tone: "info" },
};

/**
 * A small state icon. It is hidden from assistive technology, so always put a
 * text label beside it.
 */
export function Lamp({ state }: { state: LampState }) {
  const Icon = LAMP[state].icon;
  return (
    <span className="lamp" data-state={state} aria-hidden="true">
      <Icon strokeWidth={2} aria-hidden="true" focusable="false" />
    </span>
  );
}

/** A status pill: an icon and a label, never colour alone. */
export function Status({ state, children }: { state: LampState; children: ReactNode }) {
  const { icon: Icon, tone } = LAMP[state];
  return (
    <span className="pill status" data-tone={tone}>
      <Icon strokeWidth={2} aria-hidden="true" focusable="false" />
      {children}
    </span>
  );
}

/** A pill with your own icon and tone, for labels that are not a sale or access state. */
export function Pill({
  tone = "neutral",
  icon: Icon,
  square = false,
  children,
}: {
  tone?: PillTone;
  icon?: LucideIcon;
  square?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={square ? "pill pill--square" : "pill"} data-tone={tone}>
      {Icon ? <Icon strokeWidth={2} aria-hidden="true" focusable="false" /> : null}
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

const NOTICE: Record<"info" | "error" | "warning" | "success", { icon: LucideIcon; state: LampState }> = {
  info: { icon: Info, state: "waiting" },
  error: { icon: CircleX, state: "error" },
  warning: { icon: TriangleAlert, state: "due" },
  success: { icon: CircleCheck, state: "granted" },
};

/** An inline alert: icon, title, body, and one optional action. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  live = false,
}: {
  tone?: "info" | "error" | "warning" | "success";
  title: string;
  children?: ReactNode;
  /** One action on the right, for example a retry button. */
  action?: ReactNode;
  live?: boolean;
}) {
  const { icon: Icon, state } = NOTICE[tone];
  return (
    <div className="notice" data-tone={tone} role={live ? (tone === "error" ? "alert" : "status") : undefined}>
      <span className="lamp" data-state={state} aria-hidden="true">
        <Icon strokeWidth={2} aria-hidden="true" focusable="false" />
      </span>
      <div className="notice__content">
        <p className="notice__title">{title}</p>
        {children ? <div className="notice__body">{children}</div> : null}
      </div>
      {action ? <div className="notice__action">{action}</div> : null}
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

/** An empty list or section. Put one sentence and, if useful, one button inside. */
export function Empty({ title, children, icon: Icon = Inbox }: { title: string; children?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="empty">
      <Icon className="empty__icon" strokeWidth={1.75} aria-hidden="true" focusable="false" />
      <p className="empty__title">{title}</p>
      {children}
    </div>
  );
}

/** A section that could not load. Say what failed and what to do next. */
export function ErrorState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state" data-tone="error">
      <CircleAlert className="state__icon" strokeWidth={1.75} aria-hidden="true" focusable="false" />
      <p className="state__title">{title}</p>
      {children}
    </div>
  );
}

/** A section that is loading. It keeps the shape of a card so nothing jumps. */
export function LoadingState({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="state state--loading" role="status" aria-busy="true">
      <p className="state__eyebrow">{label}</p>
      <SkeletonRows rows={rows} />
    </div>
  );
}

/**
 * A card: a header with title, description, and an action, then a body. The
 * title becomes the card's accessible name.
 */
export function Plate({
  title,
  description,
  action,
  icon,
  flush = false,
  footer,
  children,
  labelledBy,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** A Lucide icon element for the tile left of the title, for example `<Clock />`. */
  icon?: ReactNode;
  /** Remove the body padding, for a table or list that runs edge to edge. */
  flush?: boolean;
  /** A row under the body, for example totals or buttons. */
  footer?: ReactNode;
  children: ReactNode;
  labelledBy?: string;
}) {
  const id = labelledBy ?? `plate-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="plate" aria-labelledby={id}>
      <div className="plate__head">
        {icon ? (
          <span className="plate__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="plate__text">
          <h2 id={id}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="plate__action">{action}</div> : null}
      </div>
      <div className={flush ? "plate__body plate__body--flush" : "plate__body"}>{children}</div>
      {footer ? <div className="plate__footer">{footer}</div> : null}
    </section>
  );
}

/** Another name for `Plate`, to match the Paper kit ("card"). */
export const Card = Plate;

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
          <TriangleAlert strokeWidth={2} aria-hidden="true" focusable="false" />
          <span>{error}</span>
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

export type ButtonVariant = "primary" | "secondary" | "ghost" | "critical";
export type ButtonSize = "default" | "small" | "large";

/**
 * The class string for a button or a link that looks like one. Use it on a
 * router `Link`: `<Link className={buttonClass({ variant: "secondary" })}>`.
 */
export function buttonClass({
  variant = "primary",
  size = "default",
}: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
  return [
    "button",
    variant === "primary" ? null : `button--${variant}`,
    size === "default" ? null : `button--${size}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  disabled = false,
  large = false,
  variant = "primary",
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  disabled?: boolean;
  large?: boolean;
  variant?: ButtonVariant;
}) {
  return (
    <button
      type="submit"
      className={buttonClass({ variant, size: large ? "large" : "default" })}
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

/** The page title, a description, and actions on the right. */
export function PageHead({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {children ? <div className="page-head__actions">{children}</div> : null}
    </header>
  );
}

/** Up to two initials from a name. Words that start with a digit or symbol are skipped. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const named = words.filter((word) => /^\p{L}/u.test(word));
  // No word starts with a letter, so use the first character of the name.
  if (named.length === 0) return (Array.from(words[0]!)[0] ?? "?").toUpperCase();
  const first = Array.from(named[0]!)[0]!;
  const last = named.length > 1 ? Array.from(named[named.length - 1]!)[0]! : "";
  return (first + last).toUpperCase();
}

/** A round avatar with initials. The name is not repeated for assistive technology. */
export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ "--size": `${size}px` } as CSSProperties} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/**
 * The Flowfokus mark and name. The mark is the logo from the Paper file. The name
 * is plain text in the mono face, because the drawn wordmark font is not shipped.
 */
export function Wordmark() {
  return (
    <span className="wordmark">
      <svg className="wordmark__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <rect width="16" height="16" rx="3.5" fill="#0A0A0B" />
        <path
          d="M10.6 8a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M8.85 11.03a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M5.35 11.03a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M3.6 8a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M5.35 4.97a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M8.85 4.97a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0"
          fill="#CFCFD3"
        />
        <path
          d="M13.29 9.59a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M11.69 12.38a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M8.92 13.99a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M5.71 13.99a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M2.92 12.39a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M1.31 9.62a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M1.31 6.41a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M2.91 3.62a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M5.68 2.01a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M8.89 2.01a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M11.68 3.61a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0M13.29 6.38a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0"
          fill="#7C7C82"
        />
        <path d="M6.25 8a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0 -3.5 0" fill="#FFFFFF" />
      </svg>
      <span className="wordmark__text">Flowfokus</span>
    </span>
  );
}

export { formatDateTime };

import type { ReactNode } from "react";
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
import markUrl from "../assets/flowfokus-mark.svg?url";
import { failureMessage, formatDateTime, formatMoney } from "../lib/format";
import type { Failure } from "../lib/result";
import { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle } from "./ui/alert";
import { Avatar as AvatarRoot, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardHeading, CardIcon, CardTitle } from "./ui/card";
import { Empty as EmptyRoot, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Field as FieldRoot, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Skeleton } from "./ui/skeleton";

/*
 * Shared UI parts for the staff portal, built on the shadcn components in
 * components/ui/. These add the portal's conventions: icons with every state,
 * accessible names, and hint and error wiring. Styles live in
 * styles/components.css.
 *
 * Exports: Lamp, Status, Pill, Money, Time, Notice, FailureNotice, Empty,
 * ErrorState, LoadingState, Plate (and Card, an alias), Field, describedBy,
 * SubmitButton, SkeletonRows, PageHead, Avatar, initials, Wordmark,
 * formatDateTime. For a button, use `Button` or `buttonVariants` from
 * components/ui/button.
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
    <Badge tone={tone} className="status">
      <Icon strokeWidth={2} aria-hidden="true" focusable="false" />
      {children}
    </Badge>
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
    <Badge variant={square ? "square" : "pill"} tone={tone}>
      {Icon ? <Icon strokeWidth={2} aria-hidden="true" focusable="false" /> : null}
      {children}
    </Badge>
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
    <Alert tone={tone} role={live ? (tone === "error" ? "alert" : "status") : undefined}>
      <span className="lamp" data-state={state} aria-hidden="true">
        <Icon strokeWidth={2} aria-hidden="true" focusable="false" />
      </span>
      <AlertContent>
        <AlertTitle>{title}</AlertTitle>
        {children ? <AlertDescription>{children}</AlertDescription> : null}
      </AlertContent>
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
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
    <EmptyRoot>
      <EmptyMedia>
        <Icon strokeWidth={1.75} aria-hidden="true" focusable="false" />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      {children}
    </EmptyRoot>
  );
}

/** A section that could not load. Say what failed and what to do next. */
export function ErrorState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <EmptyRoot className="state" data-tone="error">
      <EmptyMedia className="state__icon">
        <CircleAlert strokeWidth={1.75} aria-hidden="true" focusable="false" />
      </EmptyMedia>
      <EmptyTitle className="state__title">{title}</EmptyTitle>
      {children}
    </EmptyRoot>
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
    <Card aria-labelledby={id}>
      <CardHeader>
        {icon ? <CardIcon>{icon}</CardIcon> : null}
        <CardHeading>
          <CardTitle id={id}>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeading>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent flush={flush}>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
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
    <FieldRoot>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription> : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </FieldRoot>
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
  variant = "default",
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  disabled?: boolean;
  large?: boolean;
  variant?: "default" | "secondary" | "ghost" | "destructive";
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size={large ? "lg" : "default"}
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
    </Button>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="skeleton-rows">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} style={{ width: `${88 - index * 9}%` }} />
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
    <AvatarRoot size={size} aria-hidden="true">
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </AvatarRoot>
  );
}

/**
 * The Flowfokus logo mark and the dot-matrix wordmark, both taken from the Paper
 * file. The wordmark image names the brand for assistive technology. The mark is
 * decoration.
 */
export function Wordmark() {
  return (
    <span className="wordmark">
      <img className="wordmark__mark" src={markUrl} width={22} height={22} alt="" />
      {/* Drawn as a CSS mask filled with ink, so it follows the theme. */}
      <span className="wordmark__text" role="img" aria-label="Flowfokus" />
    </span>
  );
}

export { formatDateTime };

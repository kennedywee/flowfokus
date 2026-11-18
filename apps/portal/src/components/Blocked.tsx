import type { ReactNode } from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { SignOutForm } from "./Session";

/*
 * Paper's sign-in card: the logo, a title, one message, one action, and the
 * signed-in account with Sign out. Every screen outside an organization uses
 * it: the portal start, the organization chooser, access turned off, an
 * organization that did not open, page not found, and the app error screen.
 */

/** Paper's sign-in mark: a dark rounded square with a dot. It follows the theme. */
function EntryMark() {
  return (
    <svg className="entry__mark" width="28" height="28" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect width="16" height="16" rx="3.5" fill="currentColor" />
      <circle cx="8" cy="8" r="1.75" className="entry__mark-dot" />
    </svg>
  );
}

export function Blocked({
  title,
  message,
  tone,
  account,
  children,
}: {
  title: string;
  /** One staff sentence under the title. */
  message?: ReactNode;
  /** An error or warning message gets Paper's small red or amber icon. */
  tone?: "error" | "warning";
  /** The signed-in email. Shows the account line with Sign out. */
  account?: string | null;
  /** The action, such as Sign in or Go to the staff portal, or the organization list. */
  children?: ReactNode;
}) {
  const Icon = tone === "warning" ? TriangleAlert : CircleAlert;
  return (
    <main className="entry" id="main">
      <div className="entry__card">
        <div className="entry__head">
          <EntryMark />
          <h1 className="entry__title">{title}</h1>
        </div>
        {message ? (
          tone ? (
            <p className="entry__message" data-tone={tone} role={tone === "error" ? "alert" : undefined}>
              <Icon className="entry__icon" strokeWidth={2} aria-hidden="true" focusable="false" />
              <span>{message}</span>
            </p>
          ) : (
            <p className="entry__message entry__message--quiet">{message}</p>
          )
        ) : null}
        {children}
        {account ? (
          <div className="entry__account">
            <span className="entry__email">{account}</span>
            <SignOutForm variant="link" />
          </div>
        ) : null}
      </div>
    </main>
  );
}

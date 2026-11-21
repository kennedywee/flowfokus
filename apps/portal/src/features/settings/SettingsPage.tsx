import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/*
 * The parts of a settings page inside the Settings dialog: the page title
 * with its one action, sections with a hairline under their header, and rows
 * of a title, one line of description, and one control. Rows have no lines
 * between them.
 */

export function SettingsPage({
  title,
  action,
  children,
}: {
  title: string;
  /** The page's primary action beside the title, such as Invite staff. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="settings-page">
      <header className="settings-page__head">
        <h2 className="settings-page__title">{title}</h2>
        {action}
      </header>
      {children}
    </div>
  );
}

/** The secondary 32px button with a plus that sits beside a page title. */
export function SettingsPageAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" size="compact" className="settings-page__action" onClick={onClick}>
      <Icon name="plus" aria-hidden="true" focusable="false" />
      {children}
    </Button>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="settings-section" aria-labelledby={id}>
      <h3 className="settings-section__title" id={id}>
        {title}
      </h3>
      <div className="settings-section__rows">{children}</div>
    </section>
  );
}

/**
 * One setting. `htmlFor` names the control with the title; without it the
 * title is plain text beside a value.
 */
export function SettingsRow({
  title,
  description,
  htmlFor,
  id,
  children,
}: {
  title: string;
  description?: string;
  htmlFor?: string;
  /** The title's id, for a control that names itself with aria-labelledby. */
  id?: string;
  children: ReactNode;
}) {
  const descriptionId = htmlFor ? `${htmlFor}-description` : undefined;
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        {htmlFor ? (
          <label className="settings-row__title" htmlFor={htmlFor} id={id}>
            {title}
          </label>
        ) : (
          <span className="settings-row__title" id={id}>
            {title}
          </span>
        )}
        {description ? (
          <span className="settings-row__description" id={descriptionId}>
            {description}
          </span>
        ) : null}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

/** Why this role sees the page but cannot change it. */
export function LockLine({ children }: { children: ReactNode }) {
  return (
    <p className="settings-lock">
      <Icon name="roles" aria-hidden="true" focusable="false" />
      {children}
    </p>
  );
}

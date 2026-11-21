import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useOrganization } from "../../lib/organization";
import { SettingsBack } from "./SettingsNav";

/**
 * One settings section: "‹ Settings" on phones, the title, and its actions
 * (put a `PageActions` in `actions`). Paper "Settings — General" and the rest.
 */
export function SettingsPage({
  title,
  facts,
  actions,
  className,
  children,
}: {
  title: string;
  /** Facts beside the title, such as the "Sample data" pill. */
  facts?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const organization = useOrganization();
  return (
    <div className={`page settings-page${className ? ` ${className}` : ""}`}>
      <SettingsBack slug={organization.slug} />
      <header className="settings-head">
        <h1>{title}</h1>
        {facts}
        {actions}
      </header>
      {children}
    </div>
  );
}

/** Paper's lock line: why this role sees the section but cannot change it. */
export function LockLine({ children }: { children: ReactNode }) {
  return (
    <p className="settings-lock">
      <Icon name="roles" aria-hidden="true" focusable="false" />
      {children}
    </p>
  );
}

/** A grey section band, as in Paper ("Gym", "Region"). */
export function SettingsBand({ title, id }: { title: string; id?: string }) {
  return (
    <h2 className="settings-band" id={id}>
      {title}
    </h2>
  );
}

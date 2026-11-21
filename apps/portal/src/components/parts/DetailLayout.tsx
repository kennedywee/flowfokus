import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { RecordBackdrop, type RecordKind } from "./Backdrop";

const icon = { "aria-hidden": true, focusable: false } as const;

/*
 * The detail page (Paper "Member details", "Sale details", "Program details"):
 * a main column and a right panel. The main column holds the hero and the
 * sections; the panel holds label and value rows under "Details", and groups
 * such as Tags and Notes with a "+" button. Below 1100px the panel sits under
 * the main column. One faint pattern per record type sits behind both.
 */
export function DetailLayout({ record, panel, children, className }: { record: RecordKind; panel?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("detail", className)}>
      <RecordBackdrop record={record} />
      <div className="detail__main">{children}</div>
      {panel ? <aside className="detail__panel" aria-label="Details">{panel}</aside> : null}
    </div>
  );
}

/**
 * The hero: an avatar or icon tile, the title, one muted line, and up to two
 * stats on the right. `display` is the 36px title of a program or session.
 */
export function DetailHero({
  tile,
  title,
  line,
  stats,
  size = "default",
  children,
}: {
  tile?: ReactNode;
  title: string;
  /** One muted line, such as "Member since Mar 2024, Bangsar". */
  line?: ReactNode;
  stats?: readonly [HeroStat] | readonly [HeroStat, HeroStat];
  size?: "default" | "display";
  /** Facts beside the title, such as a status mark. */
  children?: ReactNode;
}) {
  return (
    <header className="hero" data-size={size}>
      {tile}
      <div className="hero__text">
        <h1 className="hero__title">{title}</h1>
        {children ? <div className="hero__facts">{children}</div> : null}
        {line ? <p className="hero__line">{line}</p> : null}
      </div>
      {stats?.length ? <HeroStats stats={stats} /> : null}
    </header>
  );
}

/** Up to two figures with a small label under each. A list page uses it beside its title too. */
export function HeroStats({ stats }: { stats: readonly HeroStat[] }) {
  return (
    <dl className="hero__stats">
      {stats.map((stat) => (
        <div key={stat.label} className="hero__stat">
          <dd className="hero__value">{stat.value}</dd>
          <dt className="hero__label">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export interface HeroStat {
  value: ReactNode;
  label: string;
}

/** The 44px round tile of a hero: initials, or an icon for a record that is not a person. */
export function HeroTile({ initials, icon: iconName }: { initials?: string; icon?: IconName }) {
  return (
    <span className="tile tile--hero" aria-hidden="true">
      {iconName ? <Icon name={iconName} size={18} {...icon} /> : initials}
    </span>
  );
}

/** A panel group with a quiet grey title: "Details", "Contact", "Location". */
export function PanelGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="panel-group" aria-label={title}>
      {title ? <h2 className="panel-group__title">{title}</h2> : null}
      {children}
    </section>
  );
}

/** A label and its value: a 96px grey label, then the value in ink. */
export function PanelRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="panel-row">
      <dt className="panel-row__label">{label}</dt>
      <dd className="panel-row__value">{children}</dd>
    </div>
  );
}

/** A list of PanelRow. Use it inside a PanelGroup. */
export function PanelRows({ children }: { children: ReactNode }) {
  return <dl className="panel-rows">{children}</dl>;
}

/**
 * A panel group whose title has a "+" button, such as Tags and Notes. Leave
 * `onAdd` out when the person cannot add one: the button then does not show.
 */
export function PanelAddGroup({ title, addLabel, onAdd, children }: { title: string; addLabel: string; onAdd?: () => void; children?: ReactNode }) {
  return (
    <section className="panel-group" aria-label={title}>
      <div className="panel-group__head">
        <h2 className="panel-group__title">{title}</h2>
        {onAdd ? (
          <button type="button" className="panel-group__add" aria-label={addLabel} onClick={onAdd}>
            <Icon name="plus" size={14} {...icon} />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A note: the text, then who wrote it and when, in small grey type. */
export function PanelNote({ children, by }: { children: ReactNode; by: string }) {
  return (
    <div className="panel-note">
      <p className="panel-note__text">{children}</p>
      <p className="panel-note__by">{by}</p>
    </div>
  );
}

/** Tag chips in a wrapping row. */
export function PanelTags({ children }: { children: ReactNode }) {
  return <div className="panel-tags">{children}</div>;
}

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { creditTone, mixShares, pieSlice, spotKinds, type SpotKind } from "@/lib/list-parts";
import { cn } from "@/lib/utils";

const icon = { "aria-hidden": true, focusable: false } as const;

/*
 * Data marks (Paper "Program details", "Product details", "Pass credits").
 * A mark is drawn state. A status mark always has its label beside it, and
 * the label words come from the Rails response: payment, fulfillment, and
 * access stay separate facts, each with its own mark.
 */

/** A coloured dot for a tag or an event. The dot never carries the meaning alone: a label sits beside it. */
export type DotTone = "neutral" | "good" | "warning" | "critical" | "info" | "violet";

export function Dot({ tone = "neutral", className }: { tone?: DotTone; className?: string }) {
  return <i className={cn("dot", className)} data-tone={tone} aria-hidden="true" />;
}

/** A tag: a coloured dot and a name, in a pill. */
export function TagChip({ tone = "neutral", children }: { tone?: DotTone; children: ReactNode }) {
  return (
    <span className="tag-chip">
      <Dot tone={tone} />
      {children}
    </span>
  );
}

export type StatusKind = "paid" | "partlyPaid" | "unpaid" | "fulfilled" | "partlyFulfilled" | "unfulfilled";
export type StatusTone = "good" | "warning" | "critical" | "neutral";

const STATUS_ICON: Record<StatusKind, IconName> = {
  paid: "paid",
  partlyPaid: "partlyPaid",
  unpaid: "payments",
  fulfilled: "fulfilled",
  partlyFulfilled: "partlyFulfilled",
  unfulfilled: "unfulfilled",
};

/**
 * A ring or pie for Paid, Partly paid, Fulfilled, and the rest, with its
 * label. `tone` colours the mark; the label stays ink. `boxed` puts both in
 * the quiet pill of a detail hero.
 */
export function StatusMark({
  kind,
  tone = "neutral",
  boxed = false,
  children,
}: {
  kind: StatusKind;
  tone?: StatusTone;
  boxed?: boolean;
  /** The label. Use the word Rails returned. */
  children: ReactNode;
}) {
  return (
    <span className={cn("status-mark", boxed && "status-mark--boxed")} data-tone={tone}>
      <Icon name={STATUS_ICON[kind]} size={14} {...icon} />
      <span className="status-mark__label">{children}</span>
    </span>
  );
}

/**
 * A time pie for "Renews in 12d" and "Ends in 2d": the slice is the share of
 * the period that has passed. The mark is drawn, so the label beside it carries the meaning.
 */
export function TimeMark({
  fraction,
  tone = "good",
  children,
}: {
  /** 0 to 1: how much of the period is left. */
  fraction: number;
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span className="status-mark" data-tone={tone}>
      <Ring fraction={fraction} />
      <span className="status-mark__label">{children}</span>
    </span>
  );
}

function Ring({ fraction }: { fraction: number }) {
  const slice = pieSlice(fraction);
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="pie-mark" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      {slice ? <path d={slice} fill="currentColor" /> : null}
    </svg>
  );
}

/**
 * The ring of a pass: "7 of 10 left". Amber at two or fewer left, and at none. The text is the fact; the ring only shows it.
 */
export function CreditRing({ left, total, children }: { left: number; total: number; children?: ReactNode }) {
  const tone = creditTone(left);
  return (
    <span className="credit-ring" data-tone={tone}>
      <Ring fraction={total > 0 ? left / total : 0} />
      <span className="credit-ring__label">{children ?? `${left} of ${total} left`}</span>
    </span>
  );
}

/*
 * Spot stack. One slanted segment per spot: booked is ink, open is faint,
 * full is amber, past is grey. Row size is a short run of upright stripes; chart
 * size stacks the segments of one session in a column.
 */
const SPOT_CLASS: Record<SpotKind, string> = { booked: "spot--booked", open: "spot--open", full: "spot--full", past: "spot--past" };

/** One run of spots, left to right, at row size (60 x 12 for twelve spots). */
export function SpotRow({ capacity, booked, state = "upcoming", label }: { capacity: number; booked: number; state?: "upcoming" | "past"; label?: string }) {
  const spots = spotKinds(capacity, booked, state);
  const width = Math.max(1, spots.length) * 5;
  return (
    <svg
      className="spot-row"
      width={width}
      height="12"
      viewBox={`0 0 ${width} 12`}
      role="img"
      aria-label={label ?? `${booked} of ${capacity} spots booked`}
    >
      {spots.map((kind, index) => (
        <path key={index} className={SPOT_CLASS[kind]} d={`M${index * 5} 11L${index * 5 + 1.5} 1H${index * 5 + 4}L${index * 5 + 2.5} 11Z`} />
      ))}
    </svg>
  );
}

/** One session as a column of spots at chart size. Stack several side by side for a chart. */
export function SpotColumn({ capacity, booked, state = "upcoming", cancelled = false }: { capacity: number; booked: number; state?: "upcoming" | "past"; cancelled?: boolean }) {
  const spots = spotKinds(capacity, booked, state);
  const height = Math.max(1, spots.length) * 8;
  return (
    <svg
      className="spot-column"
      width="10"
      height={height}
      viewBox={`0 0 10 ${height}`}
      role="img"
      aria-label={cancelled ? "Cancelled" : `${booked} of ${capacity} spots booked`}
    >
      {cancelled ? (
        <path className="spot--cancelled" d={`M2 ${height - 8}l6 6M8 ${height - 8}l-6 6`} />
      ) : (
        spots.map((kind, index) => {
          const y = height - 6.5 - index * 8;
          return <path key={index} className={SPOT_CLASS[kind]} d={`M0 ${y + 2}L10 ${y}V${y + 4.5}L0 ${y + 6.5}Z`} />;
        })
      )}
    </svg>
  );
}

/** The key under a spot stack: Booked, Open, Full, Past. */
export function SpotKey({ kinds = ["booked", "open", "full"] }: { kinds?: readonly SpotKind[] }) {
  const words: Record<SpotKind, string> = { booked: "Booked", open: "Open", full: "Full", past: "Past" };
  return (
    <span className="spot-key">
      {kinds.map((kind) => (
        <span key={kind} className="spot-key__item">
          <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true" focusable="false">
            <path className={SPOT_CLASS[kind]} d="M0 4L10 2V6.5L0 8.5Z" />
          </svg>
          {words[kind]}
        </span>
      ))}
    </span>
  );
}

/**
 * A row of slanted stripes shaded by share, such as how sales split across
 * the ways to book. The stripes run darkest to lightest. The labels beside it
 * give the numbers, so the bar can stay decorative.
 */
export function MixBar({ counts, label }: { counts: readonly number[]; label?: string }) {
  const shares = mixShares(counts);
  const shades = ["ink", "ink-2", "ink-3", "ink-4"] as const;
  return (
    <span className="mix-bar" role="img" aria-label={label ?? `Mix: ${shares.map((share) => `${share}%`).join(", ")}`}>
      {shares.map((share, index) => (
        <i key={index} className="mix-bar__stripe" data-shade={shades[Math.min(index, shades.length - 1)]} style={{ flexGrow: share || 0.0001 }} />
      ))}
    </span>
  );
}

/** A round tile of initials, for a person in a row. A hero uses `HeroTile`. */
export function Tile({ size = "default", square = false, children }: { size?: "default" | "small"; square?: boolean; children: ReactNode }) {
  return (
    <span className={cn("tile", size === "small" && "tile--small", square && "tile--square")} aria-hidden="true">
      {children}
    </span>
  );
}

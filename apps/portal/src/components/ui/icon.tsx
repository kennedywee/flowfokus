import type { ReactNode, SVGProps } from "react";

/*
 * The portal's icon set, drawn in the Paper file "Flowfokus Design" (page
 * "Icons"). Every icon in the portal comes from here. They sit on a 16px grid,
 * with a 1.25 stroke, round ends, and soft corners. Most draw in
 * `currentColor`, so the parent's text colour sets the colour. The status
 * icons (paid, fulfilled, partlyFulfilled, partlyPaid) also use
 * `currentColor` for the mark, so a tone class on the parent gives the status
 * colour. A grey part uses `--color-ink-3`. Names are in `ICON_NAMES`; the
 * component gallery shows each one.
 */

const ICONS = {
  members: (
    <>
      <circle cx="6.5" cy="5.25" r="2.25" />
      <path d="M2.5 13.25a4 4 0 0 1 8 0" />
      <path d="M10.75 3.1a2.25 2.25 0 0 1 0 4.3" />
      <path d="M12.25 9.6a4 4 0 0 1 1.25 3.65" />
    </>
  ),
  sales: (
    <>
      <path d="M3.5 13.5V4.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v9l-1.75-1-1.5 1-1.25-1-1.25 1-1.5-1z" />
      <path d="M6 6h4" />
      <path d="M6 8.5h2.5" />
    </>
  ),
  checkIns: (
    <>
      <path d="M9 2.5h2a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H9" />
      <path d="M2.5 8h7" />
      <path d="M7 5.5 9.5 8 7 10.5" />
    </>
  ),
  schedule: (
    <>
      <path d="M2.5 6A2.5 2.5 0 0 1 5 3.5h6A2.5 2.5 0 0 1 13.5 6v5a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 11z" />
      <path d="M2.5 6.75h11" />
      <path d="M5.5 2v2.5" />
      <path d="M10.5 2v2.5" />
      <circle cx="10.25" cy="10.25" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  programs: (
    <>
      <path d="M8 2.5 13.5 5.25 8 8 2.5 5.25z" />
      <path d="M2.5 8.25 8 11l5.5-2.75" />
      <path d="M2.5 11.25 8 14l5.5-2.75" />
    </>
  ),
  products: (
    <>
      <path d="M2.5 3.75v3.6c0 .4.15.78.44 1.06l4.6 4.6a1.5 1.5 0 0 0 2.12 0l3.33-3.33a1.5 1.5 0 0 0 0-2.12l-4.6-4.6A1.5 1.5 0 0 0 7.35 2.5H3.75c-.69 0-1.25.56-1.25 1.25z" />
      <circle cx="5.5" cy="5.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  sidebar: (
    <>
      <path d="M2.5 5.5a2.5 2.5 0 0 1 2.5-2.5h6a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M6.25 3v10" />
    </>
  ),
  chevrons: (
    <>
      <path d="M5.5 6.25 8 3.75l2.5 2.5" />
      <path d="M5.5 9.75 8 12.25l2.5-2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="7.25" cy="7.25" r="4.25" />
      <path d="M10.5 10.5 13.5 13.5" />
    </>
  ),
  more: (
    <>
      <circle cx="3.75" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12.25" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  plus: (
    <>
      <path d="M8 3.5v9" />
      <path d="M3.5 8h9" />
    </>
  ),
  activity: <path d="M1.75 8.5h2.5l1.75-4.5 3.5 8 1.75-4h2.75" />,
  attach: <path d="M10.25 5.25 6.5 9a1.06 1.06 0 0 0 1.5 1.5l4-4a2.5 2.5 0 0 0-3.54-3.54l-4 4a3.94 3.94 0 0 0 5.58 5.58L13.5 9" />,
  mention: (
    <>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M10.25 8v.9a1.85 1.85 0 0 0 3.7 0V8a5.95 5.95 0 1 0-2.35 4.75" />
    </>
  ),
  paid: (
    <>
      <circle cx="8" cy="8" r="6.5" fill="currentColor" stroke="none" />
      <path d="M5.25 8.25 7.1 10l3.65-4" stroke="var(--color-surface)" strokeWidth="1.5" />
    </>
  ),
  fulfilled: (
    <>
      <path d="M13.25 8.25V5L8 2.25 2.75 5v6L8 13.75l.75-.4" />
      <path d="M2.75 5 8 7.75 13.25 5" />
      <path d="M8 7.75v6" />
      <path d="m10.25 12.1 1.3 1.3 2.6-2.85" />
    </>
  ),
  cash: (
    <>
      <path d="M1.75 6.25a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2z" />
      <circle cx="8" cy="8" r="1.6" />
      <circle cx="4.25" cy="8" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="11.75" cy="8" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  bank: (
    <>
      <path d="M2.25 6 8 2.75 13.75 6z" />
      <path d="M2.5 13.25h11" />
      <path d="M4.5 8v3.25" />
      <path d="M8 8v3.25" />
      <path d="M11.5 8v3.25" />
    </>
  ),
  partlyFulfilled: (
    <>
      <path d="M8 2.25 13.25 5v6L8 13.75" stroke="var(--color-ink-3)" strokeDasharray="0.01 2.1" />
      <path d="M8 2.25 2.75 5v6L8 13.75" />
      <path d="M2.75 5 8 7.75v6" />
    </>
  ),
  unfulfilled: <path d="M8 2.25 13.25 5v6L8 13.75 2.75 11V5z" stroke="var(--color-ink-3)" strokeDasharray="0.01 2.1" />,
  partlyPaid: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 8V4a4 4 0 0 1 0 8z" fill="currentColor" stroke="none" />
    </>
  ),
  send: (
    <>
      <path d="M13.5 2.5 2.5 6.75l4.5 2.25 2.25 4.5z" />
      <path d="m7 9 2.5-2.5" />
    </>
  ),
  chevronDown: <path d="M5 6.75 8 9.75l3-3" />,
  membership: (
    <>
      <path d="M1.75 6a2.5 2.5 0 0 1 2.5-2.5h7.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-7.5a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M1.75 6.75h12.5" />
      <circle cx="4.75" cy="9.75" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  pass: (
    <>
      <path d="M2.25 5.5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 2 2v.75a1.75 1.75 0 0 0 0 3.5v.75a2 2 0 0 1-2 2h-7.5a2 2 0 0 1-2-2v-.75a1.75 1.75 0 0 0 0-3.5z" />
      <circle cx="10" cy="5.75" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10.25" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  customItem: (
    <>
      <path d="M9.6 3.9a1.77 1.77 0 0 1 2.5 2.5L6 12.5l-3.25.75.75-3.25z" />
      <path d="m8.6 4.9 2.5 2.5" />
      <circle cx="12.75" cy="12.75" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  length: (
    <>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 4.75V8" strokeLinejoin="miter" />
      <circle cx="10.1" cy="9.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  capacity: (
    <>
      <path d="M2.5 5a2.5 2.5 0 0 1 2.5-2.5h6A2.5 2.5 0 0 1 13.5 5v6a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 11z" strokeLinecap="butt" />
      <path d="M5.5 10.5 6.5 5.5M8 10.5 9 5.5" strokeLinejoin="miter" />
      <circle cx="10.75" cy="9.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  visibility: (
    <>
      <path d="M1.75 8S4 3.75 8 3.75 14.25 8 14.25 8 12 12.25 8 12.25 1.75 8 1.75 8z" strokeLinecap="butt" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  groupClass: (
    <>
      <circle cx="8" cy="5.25" r="1.9" />
      <path d="M4.25 13.25a3.75 3.75 0 0 1 7.5 0" />
      <circle cx="3" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <path d="M1.5 12a2.4 2.4 0 0 1 1.6-2.25M14.5 12a2.4 2.4 0 0 0-1.6-2.25" />
    </>
  ),
  appointment: (
    <>
      <circle cx="6" cy="5.25" r="2" />
      <path d="M2 13.25a4 4 0 0 1 6.5-3.1" />
      <circle cx="11.75" cy="11" r="2.75" />
      <path d="M11.75 9.75V11" />
    </>
  ),
  event: (
    <>
      <path d="M3.75 13.75V2.75" />
      <path d="M3.75 3.25h8.5l-2 2.875 2 2.875h-8.5" />
      <circle cx="7" cy="6.125" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  profile: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3.25 13.5a4.75 4.75 0 0 1 9.5 0" />
    </>
  ),
  notifications: (
    <>
      <path d="M4.25 7a3.75 3.75 0 0 1 7.5 0v3.25l1.25 1.75H3l1.25-1.75z" />
      <path d="M6.75 14h2.5" />
    </>
  ),
  appearance: (
    <>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 2.25a5.75 5.75 0 0 1 0 11.5z" fill="currentColor" stroke="none" />
    </>
  ),
  general: (
    <>
      <path d="M6.62 3.61 6.57 2.17 9.43 2.17 9.38 3.61 11.11 4.61 12.33 3.85 13.76 6.32 12.49 7.00 12.49 9.00 13.76 9.68 12.33 12.15 11.11 11.39 9.38 12.39 9.43 13.83 6.57 13.83 6.62 12.39 4.89 11.39 3.67 12.15 2.24 9.68 3.51 9.00 3.51 7.00 2.24 6.32 3.67 3.85 4.89 4.61z" />
      <circle cx="8" cy="8" r="1.75" />
    </>
  ),
  gymSite: (
    <>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M2.25 8h11.5" />
      <path d="M8 2.25c1.6 1.6 2.4 3.5 2.4 5.75S9.6 12.150 8 13.75C6.4 12.15 5.6 10.25 5.6 8S6.4 3.85 8 2.25z" />
    </>
  ),
  location: (
    <>
      <path d="M8 14s4.75-4.1 4.75-7.6a4.75 4.75 0 0 0-9.5 0C3.25 9.9 8 14 8 14z" />
      <circle cx="8" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  payments: (
    <>
      <path d="M2.5 7.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z" />
      <path d="M4.25 5.5 10.4 3.2a1 1 0 0 1 1.35.94V5.5" />
      <circle cx="10.75" cy="9.25" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  bookingRules: (
    <>
      <path d="M2.5 6A2.5 2.5 0 0 1 5 3.5h6A2.5 2.5 0 0 1 13.5 6v5a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 11z" />
      <path d="M2.5 6.75h11" />
      <path d="M5.5 2v2.5" />
      <path d="M10.5 2v2.5" />
      <path d="m5.75 10.1 1.5 1.5 3-3" />
    </>
  ),
  staff: (
    <>
      <path d="M3.5 4.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z" />
      <circle cx="8" cy="6.75" r="1.6" />
      <path d="M5.75 11.25a2.25 2.25 0 0 1 4.5 0" />
    </>
  ),
  roles: (
    <>
      <path d="M8 2 13 4v3.6c0 2.95-2.05 5.2-5 6.4-2.95-1.2-5-3.45-5-6.4V4z" />
      <circle cx="8" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  edit: (
    <>
      <path d="M9.6 3.9a1.77 1.77 0 0 1 2.5 2.5L6 12.5l-3.25.75.75-3.25z" />
      <path d="m8.6 4.9 2.5 2.5" />
    </>
  ),
  copy: (
    <>
      <path d="M5.5 7.25a1.75 1.75 0 0 1 1.75-1.75h4.5a1.75 1.75 0 0 1 1.75 1.75v4.5a1.75 1.75 0 0 1-1.75 1.75h-4.5a1.75 1.75 0 0 1-1.75-1.75z" />
      <path d="M10.5 5.5V4.25A1.75 1.75 0 0 0 8.75 2.5h-4.5A1.75 1.75 0 0 0 2.5 4.25v4.5a1.75 1.75 0 0 0 1.75 1.75H5.5" />
    </>
  ),
  openExternally: (
    <>
      <path d="M9.5 2.75h3.75V6.5" />
      <path d="M13.25 2.75 7.5 8.5" />
      <path d="M11.75 9.5v1.75a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2H6.5" />
    </>
  ),
  close: (
    <>
      <path d="M4.5 4.5l7 7" />
      <path d="M11.5 4.5l-7 7" />
    </>
  ),
  chevronRight: <path d="M6.75 5 9.75 8l-3 3" />,
  check: <path d="m3.75 8.25 2.75 2.75 5.75-6" />,
  filter: (
    <>
      <path d="M2.5 4.5h11" />
      <path d="M4.5 8h7" />
      <path d="M6.5 11.5h3" />
    </>
  ),
  display: (
    <>
      <path d="M2.5 5h6.25" />
      <path d="M11.75 5h1.75" />
      <circle cx="10.25" cy="5" r="1.5" />
      <path d="M2.5 11h1.75" />
      <path d="M7.25 11h6.25" />
      <circle cx="5.75" cy="11" r="1.5" />
    </>
  ),
  sort: (
    <>
      <path d="M5 3.25v9.5" />
      <path d="M2.75 10.5 5 12.75l2.25-2.25" />
      <path d="M11 12.75v-9.5" />
      <path d="M8.75 5.5 11 3.25l2.25 2.25" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M8 3.25v9.5" />
      <path d="M4.5 9.25 8 12.75l3.5-3.5" />
    </>
  ),
  chevronLeft: <path d="M9.25 5 6.25 8l3 3" />,
  labs: (
    <>
      <path d="M6 2.5h4" />
      <path d="M6.75 2.5v3.6L3.35 11.8a1.15 1.15 0 0 0 1 1.7h7.3a1.15 1.15 0 0 0 1-1.7L9.25 6.1V2.5" />
      <path d="M4.75 9.5h6.5" />
      <circle cx="9" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  developer: (
    <>
      <path d="M5.25 4.75 2 8l3.25 3.25" />
      <path d="M10.75 4.75 14 8l-3.25 3.25" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

/** Every icon name, in the order of the Paper icon page. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name" | "children" | "ref"> {
  name: IconName;
  /** Width and height in px. The set is drawn for 16. */
  size?: number;
}

/**
 * One icon from the set. It hides from assistive technology unless it has a
 * label (`aria-label`), so put a text label beside it or name the control.
 */
export function Icon({ name, size = 16, ...props }: IconProps) {
  const labelled = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      focusable="false"
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
}

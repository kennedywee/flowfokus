import type { Schemas } from "@flowfokus/api";
import { GrantedMark } from "../check-ins/CheckInFlow";
import { sessionState, type SessionState } from "./facts";

/*
 * The 14px status marks from the Paper Schedule and Session details frames.
 * Colour is only on the mark; the words beside it say the fact.
 */

const box = { width: 14, height: 14, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;

/** A ring that fills with the share of spots booked. */
function Pie({ share }: { share: number }) {
  const part = Math.min(1, Math.max(0, share));
  let wedge: string | null = null;
  if (part >= 1) wedge = "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18Z";
  else if (part > 0) {
    const angle = part * 2 * Math.PI;
    const x = 12 + 9 * Math.sin(angle);
    const y = 12 - 9 * Math.cos(angle);
    wedge = `M12 3A9 9 0 ${part > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}L12 12Z`;
  }
  return (
    <svg className="session-mark" data-state="open" {...box}>
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
      {wedge ? <path d={wedge} /> : null}
    </svg>
  );
}

export function SessionMark({ state, share }: { state: SessionState; share: number }) {
  switch (state) {
    case "cancelled":
      return (
        <svg className="session-mark" data-state="cancelled" {...box}>
          <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
          <path d="m9 9 6 6M15 9l-6 6" fill="none" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "ended":
      return (
        <svg className="session-mark" data-state="ended" {...box}>
          <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
          <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "full":
      return (
        <svg className="session-mark" data-state="full" {...box}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case "open":
      return <Pie share={share} />;
  }
}

export function OccurrenceMark({ occurrence, now }: { occurrence: Schemas["Occurrence"]; now?: Date }) {
  return <SessionMark state={sessionState(occurrence, now)} share={occurrence.capacity ? occurrence.spots_taken / occurrence.capacity : 0} />;
}

/** The attendance mark on a booking row and its band. */
export function AttendanceMark({ status }: { status: Schemas["BookingStatus"] | "not_marked" }) {
  switch (status) {
    case "attended":
      return <GrantedMark />;
    case "held":
      return (
        <svg className="attendance-mark" data-state="held" {...box}>
          <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
          <path d="M12 7v5l3 2" fill="none" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "expired":
      return (
        <svg className="attendance-mark" data-state="expired" {...box}>
          <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
          <path d="M12 7v5l3 2" fill="none" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "cancelled":
      return (
        <svg className="attendance-mark" data-state="cancelled" {...box}>
          <circle cx="12" cy="12" r="10" />
          <path d="m9 9 6 6M15 9l-6 6" fill="none" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg className="attendance-mark" data-state="not-marked" width={14} height={14} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="1.5" strokeDasharray="2.6 2.4" />
        </svg>
      );
  }
}

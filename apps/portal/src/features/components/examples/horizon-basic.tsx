import { Horizon } from "@/features/members/Horizon";
import { shiftDays, type Horizon as HorizonData } from "@/features/members/timeline";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// Sample data: fixed offsets from now, so the gallery always shows the same shape.
const now = Date.now();
const ticks = Array.from({ length: 38 }, (_, index) => shiftDays(now, index - 7, "Asia/Kuala_Lumpur"));
const sample: HorizonData = {
  start: ticks[0]!,
  end: ticks[37]!,
  ticks,
  events: [
    { id: "b1", kind: "booking", at: now - 6 * DAY, past: true, tone: "neutral", title: "Sauna session" },
    { id: "today", kind: "today", at: now, past: false, tone: "neutral", title: "Today" },
    { id: "b2", kind: "booking", at: now + 2 * DAY, past: false, tone: "neutral", title: "Morning strength" },
    { id: "b3", kind: "booking", at: now + 10 * DAY, past: false, tone: "neutral", title: "Sauna session" },
    { id: "e1", kind: "end", at: now + 27 * DAY, past: false, tone: "warning", title: "10 group classes ends" },
    { id: "e2", kind: "end", at: now + 30 * DAY - HOUR, past: false, tone: "critical", title: "Personal training revoked" },
  ],
};

export default function Example() {
  return (
    <div style={{ width: "100%", maxWidth: 792 }}>
      <Horizon horizon={sample} timezone="Asia/Kuala_Lumpur" />
    </div>
  );
}

import { CalendarBlock } from "@/features/calendar/Block";

/** Sample sessions, to show each kind and state. They are not from Rails. */
const BLOCKS = [
  { caption: "Class", kind: "group_class", state: "open", time: "19:00 – 20:00", name: "Yoga Flow", status: "11 of 12", spots: { capacity: 12, booked: 11 } },
  { caption: "Class, full", kind: "group_class", state: "full", time: "19:00 – 20:00", name: "HIIT Express", status: "12 of 12", spots: { capacity: 12, booked: 12 } },
  { caption: "Appointment", kind: "appointment", state: "open", time: "09:00 – 10:00", name: "PT with Aina", status: "Open" },
  { caption: "Appointment, booked", kind: "appointment", state: "full", time: "10:00 – 11:00", name: "PT with Aina", status: "Booked" },
  { caption: "Event", kind: "event", state: "open", time: "18:00 – 21:00", name: "Deadlift Seminar", status: "18 of 30 sold" },
  { caption: "Ended", kind: "group_class", state: "ended", time: "07:00 – 08:00", name: "Yoga Flow", status: "9 of 12", spots: { capacity: 12, booked: 9 } },
  { caption: "Cancelled", kind: "group_class", state: "cancelled", time: "19:00 – 20:00", name: "Yoga Flow", status: "Cancelled · Coach unwell", spots: { capacity: 12, booked: 0 } },
] as const;

export default function Example() {
  return (
    <div className="gallery-stack">
      <p className="gallery-caption">Day grid size, sample data</p>
      <div className="gallery-row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        {BLOCKS.map((block) => (
          <figure key={block.caption} style={{ margin: 0, display: "grid", gap: 6, width: 168 }}>
            <div style={{ height: 64 }}>
              <CalendarBlock {...block} />
            </div>
            <figcaption className="gallery-caption">{block.caption}</figcaption>
          </figure>
        ))}
      </div>
      <p className="gallery-caption">Week size and a short block</p>
      <div className="gallery-row" style={{ alignItems: "flex-start", gap: 16 }}>
        <div style={{ width: 128 }}>
          <CalendarBlock kind="group_class" state="open" variant="week" time="19:00" name="Yoga Flow" status="9 of 12" />
        </div>
        <div style={{ width: 168, height: 30 }}>
          <CalendarBlock kind="group_class" state="open" density="tight" time="07:00" name="Mobility" status="2 of 8" />
        </div>
      </div>
    </div>
  );
}

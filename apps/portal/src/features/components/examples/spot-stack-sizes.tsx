import { SpotColumn, SpotKey, SpotRow } from "@/components/parts/marks";

const SESSIONS = [
  { capacity: 12, booked: 12, state: "past" as const, label: "2 Nov" },
  { capacity: 12, booked: 9, state: "past" as const, label: "4 Nov" },
  { capacity: 12, booked: 11, state: "upcoming" as const, label: "5 Nov" },
  { capacity: 12, booked: 12, state: "upcoming" as const, label: "6 Nov" },
  { capacity: 12, booked: 0, state: "upcoming" as const, label: "9 Nov", cancelled: true },
  { capacity: 12, booked: 7, state: "upcoming" as const, label: "11 Nov" },
];

export default function Example() {
  return (
    <div className="gallery-stack">
      <p className="gallery-caption">Chart size: one column per session</p>
      <div className="gallery-row" style={{ alignItems: "flex-end", gap: 24 }}>
        {SESSIONS.map((session) => (
          <figure key={session.label} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 6 }}>
            <SpotColumn capacity={session.capacity} booked={session.booked} state={session.state} cancelled={session.cancelled} />
            <figcaption className="gallery-caption">{session.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className="gallery-caption">Row size, with the count beside it as text</p>
      <div className="gallery-row">
        <SpotRow capacity={12} booked={11} />
        <span>11 of 12</span>
      </div>
      <div className="gallery-row">
        <SpotRow capacity={12} booked={12} />
        <span>Full</span>
      </div>
      <div className="gallery-row">
        <SpotRow capacity={12} booked={9} state="past" />
        <span>9 of 12 · past</span>
      </div>
      <div className="gallery-row">
        <SpotRow capacity={12} booked={0} cancelled />
        <span>Cancelled</span>
      </div>
      <div className="gallery-row">
        <SpotRow capacity={40} booked={30} />
        <span>30 of 40, drawn with 20 segments</span>
      </div>
      <SpotKey kinds={["booked", "open", "full", "past"]} />
    </div>
  );
}

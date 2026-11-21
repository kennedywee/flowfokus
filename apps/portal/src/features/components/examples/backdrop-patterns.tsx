import { RecordBackdrop, type RecordKind } from "@/components/parts/Backdrop";

const RECORDS: { record: RecordKind; label: string }[] = [
  { record: "member", label: "Member: glyph dots" },
  { record: "sale", label: "Sale: ledger rules" },
  { record: "program", label: "Program: orbit dots" },
  { record: "session", label: "Session: clock ticks" },
  { record: "product", label: "Product: barcode" },
];

export default function Example() {
  return (
    <div className="gallery-row" style={{ alignItems: "stretch" }}>
      {RECORDS.map(({ record, label }) => (
        <figure key={record} style={{ margin: 0, display: "grid", gap: 6, flex: "1 1 100%" }}>
          <div className="gallery-pane" style={{ minHeight: 0, height: 300 }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 864, height: 560, transform: "scale(0.7)", transformOrigin: "top left" }}>
              <RecordBackdrop record={record} />
            </div>
          </div>
          <figcaption className="gallery-caption">{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

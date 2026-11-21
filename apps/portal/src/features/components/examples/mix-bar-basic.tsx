import { MixBar } from "@/components/parts/marks";

const WAYS = [
  { label: "Monthly unlimited", count: 84 },
  { label: "10-class pass", count: 38 },
  { label: "Drop-in", count: 21 },
  { label: "Member guest", count: 7 },
];

export default function Example() {
  return (
    <div className="gallery-stack" style={{ maxWidth: 420 }}>
      <MixBar counts={WAYS.map((way) => way.count)} />
      <ul className="gallery-list">
        {WAYS.map((way) => (
          <li key={way.label}>
            <span>{way.label}</span> <span className="gallery-caption">{way.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

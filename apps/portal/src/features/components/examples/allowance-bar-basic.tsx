import { AllowanceBar } from "@/components/parts/marks";

const BENEFITS = [
  { label: "Unlimited visits", limit: null },
  { label: "10 bookings", limit: 10 },
  { label: "1 booking", limit: 1 },
  { label: "30 bookings", limit: 30 },
];

export default function Example() {
  return (
    <ul className="gallery-list">
      {BENEFITS.map((benefit) => (
        <li key={benefit.label}>
          <AllowanceBar limit={benefit.limit} label={benefit.label} /> <span>{benefit.label}</span>
        </li>
      ))}
    </ul>
  );
}

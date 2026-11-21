import type { Schemas } from "@flowfokus/api";
import { SaleAmount } from "@/features/sales/SaleFacts";

// Sample sales with only the fields the amount reads.
function sale(fields: Partial<Schemas["Sale"]>): Schemas["Sale"] {
  return { currency: "MYR", total_minor: 22000, balance_minor: 0, refunded_minor: 0, payment_status: "paid", voided_at: null, ...fields } as Schemas["Sale"];
}

const ROWS = [
  { label: "Paid", sale: sale({}) },
  { label: "Part paid", sale: sale({ payment_status: "partially_paid", balance_minor: 15000 }) },
  { label: "Unpaid", sale: sale({ payment_status: "unpaid", balance_minor: 22000 }) },
  { label: "Part refunded", sale: sale({ refunded_minor: 1000 }) },
  { label: "Void", sale: sale({ payment_status: "void", voided_at: "2026-11-04T10:00:00Z" }) },
];

export default function Example() {
  return (
    <ul className="gallery-list">
      {ROWS.map((row) => (
        <li key={row.label}>
          <span>{row.label} (sample data)</span>
          <SaleAmount sale={row.sale} />
        </li>
      ))}
    </ul>
  );
}

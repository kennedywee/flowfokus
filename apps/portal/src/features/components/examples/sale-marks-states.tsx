import type { Schemas } from "@flowfokus/api";
import { FulfillmentMark, PaymentMark } from "@/features/sales/SaleFacts";

// Sample sales with only the fields the marks read.
function sale(fields: Partial<Schemas["Sale"]>): Schemas["Sale"] {
  return { payment_status: "unpaid", fulfilled: false, voided_at: null, fulfillment: null, ...fields } as Schemas["Sale"];
}

const ROWS = [
  { label: "Paid and fulfilled", sale: sale({ payment_status: "paid", fulfilled: true }) },
  { label: "Part paid, not fulfilled", sale: sale({ payment_status: "partially_paid" }) },
  { label: "Unpaid, fulfilled", sale: sale({ fulfilled: true }) },
  { label: "Void", sale: sale({ payment_status: "void", voided_at: "2026-11-04T10:00:00Z" }) },
];

export default function Example() {
  return (
    <ul className="gallery-list">
      {ROWS.map((row) => (
        <li key={row.label}>
          <PaymentMark sale={row.sale} />
          <FulfillmentMark sale={row.sale} />
        </li>
      ))}
    </ul>
  );
}

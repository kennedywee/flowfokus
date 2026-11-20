import { Notice } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-stack">
      <Notice title="Prices changed on 1 Nov">Sales from that day use the new price.</Notice>
      <Notice tone="success" title="Payment recorded" />
      <Notice tone="warning" title="RM 120.00 is still due">Record a payment before the membership starts.</Notice>
      <Notice tone="error" title="The sale was not saved">The connection dropped. Try again.</Notice>
    </div>
  );
}

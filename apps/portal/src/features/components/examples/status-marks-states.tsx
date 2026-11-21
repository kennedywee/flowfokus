import { StatusMark, TimeMark } from "@/components/parts/marks";

export default function Example() {
  return (
    <div className="gallery-stack">
      <p className="gallery-caption">Payment, fulfillment and access are separate facts. Each has its own mark and its own label.</p>
      <div className="gallery-row">
        <StatusMark kind="paid" tone="good">Paid</StatusMark>
        <StatusMark kind="partlyPaid" tone="warning">Partly paid</StatusMark>
        <StatusMark kind="unpaid" tone="critical">Unpaid</StatusMark>
      </div>
      <div className="gallery-row">
        <StatusMark kind="fulfilled" tone="good">Fulfilled</StatusMark>
        <StatusMark kind="partlyFulfilled" tone="warning">Partly fulfilled</StatusMark>
        <StatusMark kind="unfulfilled">Unfulfilled</StatusMark>
      </div>
      <div className="gallery-row">
        <TimeMark fraction={0.4} tone="good">Renews in 12d</TimeMark>
        <TimeMark fraction={0.08} tone="warning">Ends in 2d · Not renewing</TimeMark>
        <TimeMark fraction={0.03} tone="critical">Ends in 1d · Unpaid renewal</TimeMark>
      </div>
      <p className="gallery-caption">In a hero, boxed</p>
      <div className="gallery-row">
        <StatusMark kind="partlyPaid" tone="warning" boxed>Partly paid</StatusMark>
        <StatusMark kind="partlyFulfilled" tone="warning" boxed>Partly fulfilled</StatusMark>
      </div>
    </div>
  );
}

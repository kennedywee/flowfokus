import { Icon } from "@/components/ui/icon";

export default function Example() {
  return (
    <ul className="gallery-list">
      <li data-tone="good">
        <Icon name="paid" /> Paid
      </li>
      <li data-tone="good">
        <Icon name="fulfilled" /> Fulfilled
      </li>
      <li data-tone="good">
        <Icon name="partlyFulfilled" /> Partly fulfilled
      </li>
      <li data-tone="warning">
        <Icon name="partlyPaid" /> Part paid
      </li>
      <li data-tone="neutral">
        <Icon name="unfulfilled" /> Unfulfilled
      </li>
    </ul>
  );
}

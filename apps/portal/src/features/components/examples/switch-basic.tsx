import { Switch } from "@/components/ui/switch";

export default function Example() {
  return (
    <ul className="gallery-list">
      <li>
        <Switch id="example-publish" defaultChecked />
        <label htmlFor="example-publish">Show on the gym site</label>
      </li>
      <li>
        <Switch id="example-email" />
        <label htmlFor="example-email">Email receipts</label>
      </li>
    </ul>
  );
}

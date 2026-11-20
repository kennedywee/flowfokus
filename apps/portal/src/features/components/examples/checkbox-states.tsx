import { Checkbox } from "@/components/ui/checkbox";

export default function Example() {
  return (
    <ul className="gallery-list">
      <li>
        <Checkbox id="example-off" />
        <label htmlFor="example-off">Not chosen</label>
      </li>
      <li>
        <Checkbox id="example-on" defaultChecked />
        <label htmlFor="example-on">Chosen</label>
      </li>
      <li>
        <Checkbox id="example-mixed" indeterminate />
        <label htmlFor="example-mixed">Some chosen</label>
      </li>
      <li>
        <Checkbox id="example-disabled" disabled />
        <label htmlFor="example-disabled">Disabled</label>
      </li>
    </ul>
  );
}

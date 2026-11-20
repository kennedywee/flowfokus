import { Lamp } from "@/components/ui";

export default function Example() {
  return (
    <ul className="gallery-list">
      <li>
        <Lamp state="granted" /> Checked in
      </li>
      <li>
        <Lamp state="due" /> Balance due
      </li>
      <li>
        <Lamp state="denied" /> Access denied
      </li>
    </ul>
  );
}

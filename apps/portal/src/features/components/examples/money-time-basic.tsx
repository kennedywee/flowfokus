import { Money, Time } from "@/components/ui";

export default function Example() {
  return (
    <ul className="gallery-list">
      <li>
        <Money minor={18000} currency="MYR" />
      </li>
      <li>
        <Money minor={-4550} currency="MYR" />
      </li>
      <li>
        <Time iso="2026-11-20T01:42:00Z" timeZone="Asia/Kuala_Lumpur" />
      </li>
    </ul>
  );
}

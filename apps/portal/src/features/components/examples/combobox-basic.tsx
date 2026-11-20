import { useState } from "react";
import { Combobox } from "@/components/Combobox";

const MEMBERS = [
  { value: "m1", label: "Priya Nair", detail: "priya@example.com" },
  { value: "m2", label: "Daniel Lim", detail: "daniel@example.com" },
  { value: "m3", label: "Aisha Rahman", detail: "aisha@example.com" },
  { value: "m4", label: "Marcus Tan", detail: "marcus@example.com" },
];

export default function Example() {
  const [member, setMember] = useState<string | null>(null);
  return (
    <div className="gallery-form">
      <Combobox id="example-member" label="Member" options={MEMBERS} value={member} onChange={setMember} placeholder="Search members" />
    </div>
  );
}

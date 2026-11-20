import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/ui";

export default function Example() {
  const hint = "Shown on the member's receipt.";
  return (
    <div className="gallery-form">
      <Field id="example-reference" label="Reference" hint={hint}>
        <Input id="example-reference" aria-describedby={describedBy("example-reference", hint)} />
      </Field>
    </div>
  );
}

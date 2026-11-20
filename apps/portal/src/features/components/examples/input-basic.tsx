import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-form">
      <Field id="example-name" label="Full name">
        <Input id="example-name" placeholder="Priya Nair" />
      </Field>
      <Field id="example-email" label="Email">
        <Input id="example-email" type="email" defaultValue="priya@example.com" />
      </Field>
      <Field id="example-disabled" label="Member number">
        <Input id="example-disabled" defaultValue="M-0042" disabled />
      </Field>
    </div>
  );
}

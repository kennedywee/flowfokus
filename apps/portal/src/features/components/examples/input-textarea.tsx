import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-form">
      <Field id="example-note" label="Note">
        <Textarea id="example-note" rows={3} placeholder="Prefers morning sessions" />
      </Field>
    </div>
  );
}

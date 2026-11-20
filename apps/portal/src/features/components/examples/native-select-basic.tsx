import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-form">
      <Field id="example-method" label="Method">
        <NativeSelect id="example-method" defaultValue="cash">
          <NativeSelectOption value="cash">Cash</NativeSelectOption>
          <NativeSelectOption value="bank_transfer">Bank transfer</NativeSelectOption>
          <NativeSelectOption value="card">Card</NativeSelectOption>
        </NativeSelect>
      </Field>
    </div>
  );
}

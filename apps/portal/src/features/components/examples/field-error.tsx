import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/ui";

export default function Example() {
  const error = "Enter an email address, such as name@example.com.";
  return (
    <div className="gallery-form">
      <Field id="example-email-error" label="Email" error={error}>
        <Input
          id="example-email-error"
          defaultValue="priya@"
          aria-invalid
          aria-describedby={describedBy("example-email-error", undefined, error)}
        />
      </Field>
    </div>
  );
}

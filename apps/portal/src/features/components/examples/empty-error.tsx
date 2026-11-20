import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui";

export default function Example() {
  return (
    <ErrorState title="Sales did not load">
      <p>The connection dropped.</p>
      <Button size="compact" variant="secondary">Try again</Button>
    </ErrorState>
  );
}

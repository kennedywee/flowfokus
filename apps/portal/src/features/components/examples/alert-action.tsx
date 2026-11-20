import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-stack">
      <Notice tone="error" title="Members did not load" action={<Button size="compact" variant="secondary">Try again</Button>}>
        The connection dropped.
      </Notice>
    </div>
  );
}

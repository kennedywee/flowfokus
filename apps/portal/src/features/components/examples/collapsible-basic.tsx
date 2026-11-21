import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Example() {
  return (
    <Collapsible defaultOpen className="gallery-fill">
      <CollapsibleTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>Toggle the panel</CollapsibleTrigger>
      <CollapsiblePanel>
        <p className="gallery-caption">The trigger sets aria-expanded. Enter and Space toggle it.</p>
      </CollapsiblePanel>
    </Collapsible>
  );
}

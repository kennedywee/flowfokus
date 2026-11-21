import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export default function Example() {
  return (
    <>
      <Button size="lg">Check in</Button>
      <Button>Check in</Button>
      <Button size="compact">Add member</Button>
      <Button size="sm">Export</Button>
      <Button size="icon-compact" variant="ghost" aria-label="More actions">
        <Icon name="more" aria-hidden="true" focusable="false" />
      </Button>
    </>
  );
}

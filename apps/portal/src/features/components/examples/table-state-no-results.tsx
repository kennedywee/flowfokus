import { Button } from "@/components/ui/button";
import { TableState } from "@/components/TableState";

export default function Example() {
  return (
    <div className="gallery-fill">
      <TableState
        title="No sales match"
        text="Try a different search, or clear the filters."
        action={<Button size="compact" variant="secondary">Clear search and filters</Button>}
      />
    </div>
  );
}

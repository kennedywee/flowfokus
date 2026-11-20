import { Button } from "@/components/ui/button";
import { TableState } from "@/components/TableState";

export default function Example() {
  return (
    <div className="gallery-fill">
      <TableState
        head={
          <div className="gallery-table-head" aria-hidden="true">
            <span>Member</span>
            <span>Plan</span>
            <span>Joined</span>
          </div>
        }
        title="No members yet"
        text="Add the first member to sell a membership."
        action={<Button size="compact" variant="secondary">Add member</Button>}
      />
    </div>
  );
}

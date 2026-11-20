import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui";

export default function Example() {
  return (
    <Empty title="No members yet" icon={Users}>
      <p>Add the first member to sell a membership.</p>
      <Button size="compact" variant="secondary">Add member</Button>
    </Empty>
  );
}

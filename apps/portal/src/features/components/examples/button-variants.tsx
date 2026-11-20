import { Button } from "@/components/ui/button";

export default function Example() {
  return (
    <>
      <Button>Save changes</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="ghost">Mark all read</Button>
      <Button variant="destructive">Remove access</Button>
    </>
  );
}

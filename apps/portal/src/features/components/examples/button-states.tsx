import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui";

export default function Example() {
  return (
    <>
      <Button disabled>Save changes</Button>
      <Button variant="secondary" disabled>
        Cancel
      </Button>
      <form onSubmit={(event) => event.preventDefault()}>
        <SubmitButton pending pendingLabel="Saving…">
          Save changes
        </SubmitButton>
      </form>
    </>
  );
}

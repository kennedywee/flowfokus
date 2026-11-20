import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Remove access
      </Button>
      <ConfirmDialog
        open={open}
        tone="critical"
        title="Remove Daniel Lim's access?"
        confirmLabel="Remove access"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        Daniel can no longer sign in to this organization.
      </ConfirmDialog>
    </>
  );
}

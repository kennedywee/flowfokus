import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Renew
      </Button>
      <ConfirmDialog
        open={open}
        title="Renew Priya Nair for RM 180.00?"
        confirmLabel="Renew for RM 180.00"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        The new period starts on 1 Dec.
      </ConfirmDialog>
    </>
  );
}

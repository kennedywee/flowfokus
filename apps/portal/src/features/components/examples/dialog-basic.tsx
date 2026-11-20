import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui";

export default function Example() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary" />}>Add custom item</DialogTrigger>
      <DialogContent>
        <DialogBody>
          <DialogTitle>Add custom item</DialogTitle>
          <Field id="example-item" label="Name">
            <Input id="example-item" placeholder="Guest fee" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Add item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

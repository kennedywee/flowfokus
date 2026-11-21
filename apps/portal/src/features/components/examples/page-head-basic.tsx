import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageActionsSlot } from "@/components/PageActions";
import { Kbd, PageHead, Status } from "@/components/ui";

export default function Example() {
  // In the app, the top bar provides this slot. Here a mock top bar does.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <div className="gallery-fill">
      <div className="gallery-topbar">
        <span>Top bar</span>
        <div ref={setSlot} className="page-actions" />
      </div>
      <PageActionsSlot.Provider value={slot}>
        <PageHead
          title="Sale #1058"
          meta="Sold on 4 Nov · Bukit Bintang"
          actions={
            <>
              <Button size="compact" variant="secondary">Send invoice</Button>
              <Button size="compact" aria-keyshortcuts="P">
                Record payment
                <Kbd>P</Kbd>
              </Button>
            </>
          }
        >
          <Status state="due">Part paid</Status>
        </PageHead>
      </PageActionsSlot.Provider>
    </div>
  );
}

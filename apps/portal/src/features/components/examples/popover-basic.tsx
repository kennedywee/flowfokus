import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

export default function Example() {
  return (
    <Popover modal="trap-focus">
      <PopoverTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>Open popover</PopoverTrigger>
      <PopoverContent>
        <div style={{ padding: 12, display: "grid", gap: 8 }}>
          <PopoverTitle>Saved views</PopoverTitle>
          <p style={{ margin: 0 }}>Tab stays inside. Escape closes it and focus returns to the button.</p>
          <PopoverClose className={buttonVariants({ variant: "secondary", size: "compact" })}>Close</PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

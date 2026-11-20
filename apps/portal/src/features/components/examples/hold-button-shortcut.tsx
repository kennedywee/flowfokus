import { HoldButton } from "@/components/ui/hold-button";

// Stands in for the request. The success state lasts until it settles.
const request = () => new Promise((resolve) => setTimeout(resolve, 1200));

export default function Example() {
  return (
    <HoldButton fill="line" shortcut="c" holdLabel="Hold C to check in" confirmedLabel="Checked in" onConfirm={request}>
      Check in
    </HoldButton>
  );
}

import { HoldButton } from "@/components/ui/hold-button";

// Stands in for the request. The success state lasts until it settles.
const request = () => new Promise((resolve) => setTimeout(resolve, 1200));

export default function Example() {
  return (
    <HoldButton fill="dots" holdLabel="Hold to fulfill" confirmedLabel="Fulfilled" onConfirm={request}>
      Fulfill
    </HoldButton>
  );
}

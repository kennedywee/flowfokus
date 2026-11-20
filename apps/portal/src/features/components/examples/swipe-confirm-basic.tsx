import { SwipeConfirm } from "@/components/ui/swipe-confirm";

// Stands in for the request. The success state lasts until it settles.
const request = () => new Promise((resolve) => setTimeout(resolve, 1200));

export default function Example() {
  return (
    <SwipeConfirm label="Check in" slideLabel="Slide to check in" confirmedLabel="Checked in" onConfirm={request} />
  );
}

import { useState } from "react";
import { HoldButton } from "@/components/ui/hold-button";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Example() {
  const [count, setCount] = useState(0);
  return (
    <>
      <HoldButton
        holdLabel="Hold to mark attended"
        confirmedLabel="Attended"
        onConfirm={async () => {
          await wait(1500);
          setCount((value) => value + 1);
        }}
      >
        Mark attended
      </HoldButton>
      <output>Confirmed {count} times</output>
    </>
  );
}

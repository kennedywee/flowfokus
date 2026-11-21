import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui";

export default function Example() {
  return (
    <>
      <Pill icon="length" tone="info">
        Frozen
      </Pill>
      <Pill icon="schedule">Renews 1 Dec</Pill>
      <Pill icon="schedule" square>
        Square
      </Pill>
    </>
  );
}

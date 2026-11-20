import { CalendarClock, Snowflake } from "lucide-react";
import { Pill } from "@/components/ui";

export default function Example() {
  return (
    <>
      <Pill icon={Snowflake} tone="info">
        Frozen
      </Pill>
      <Pill icon={CalendarClock}>Renews 1 Dec</Pill>
      <Pill icon={CalendarClock} square>
        Square
      </Pill>
    </>
  );
}

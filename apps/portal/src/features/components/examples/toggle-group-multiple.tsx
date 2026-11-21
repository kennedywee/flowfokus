import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** The Calendar's kinds row: each kind is its own toggle, with its count. The counts are sample data. */
export default function Example() {
  const [on, setOn] = useState(["class", "appointment", "event"]);
  return (
    <div className="gallery-row">
      <ToggleGroup multiple aria-label="Kinds of session" value={on} onValueChange={(values: string[]) => setOn(values)}>
        <ToggleGroupItem value="class">
          <Icon name="groupClass" aria-hidden="true" focusable={false} /> Classes 9
        </ToggleGroupItem>
        <ToggleGroupItem value="appointment">
          <Icon name="appointment" aria-hidden="true" focusable={false} /> Appointments 3
        </ToggleGroupItem>
        <ToggleGroupItem value="event">
          <Icon name="event" aria-hidden="true" focusable={false} /> Events 1
        </ToggleGroupItem>
      </ToggleGroup>
      <span className="gallery-caption">Showing {on.length ? on.join(", ") : "nothing"}</span>
    </div>
  );
}

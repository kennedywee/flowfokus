import { useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";

export default function Example() {
  const [value, setValue] = useState("all");
  return (
    <div className="gallery-row">
      <SegmentedControl aria-label="Show" value={value} onValueChange={(next) => setValue(next ?? "all")}>
        <SegmentedControlItem value="all">All</SegmentedControlItem>
        <SegmentedControlItem value="comments">Comments</SegmentedControlItem>
        <SegmentedControlItem value="activity">Activity</SegmentedControlItem>
      </SegmentedControl>
      <span className="gallery-caption">Showing {value}</span>
    </div>
  );
}

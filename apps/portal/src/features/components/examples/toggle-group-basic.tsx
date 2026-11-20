import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function Example() {
  return (
    <ToggleGroup aria-label="Period" defaultValue={["week"]}>
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
    </ToggleGroup>
  );
}

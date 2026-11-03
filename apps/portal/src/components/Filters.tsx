import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** A filter row. One choice stays pressed; the arrow keys move between choices. */
export function Filters<T extends string>({
  values,
  value,
  onChange,
  label,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <ToggleGroup
      className="filters"
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        // A press on the current choice would clear it. Keep one choice pressed.
        const picked = next[0] as T | undefined;
        if (picked) onChange(picked);
      }}
    >
      {values.map((item) => (
        <ToggleGroupItem key={item} value={item}>
          {item}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

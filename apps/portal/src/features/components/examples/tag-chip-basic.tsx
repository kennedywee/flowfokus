import { TagChip } from "@/components/parts/marks";

export default function Example() {
  return (
    <div className="gallery-row">
      <TagChip>Staff</TagChip>
      <TagChip tone="good">PT client</TagChip>
      <TagChip tone="warning">Student rate</TagChip>
      <TagChip tone="critical">Injury</TagChip>
      <TagChip tone="info">Corporate · Acme</TagChip>
      <TagChip tone="violet">Trial</TagChip>
    </div>
  );
}

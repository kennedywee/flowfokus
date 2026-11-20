import { SkeletonRows } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-fill">
      <SkeletonRows rows={3} />
    </div>
  );
}

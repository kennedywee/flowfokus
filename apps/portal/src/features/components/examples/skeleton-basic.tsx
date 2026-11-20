import { Skeleton } from "@/components/ui/skeleton";

export default function Example() {
  return (
    <div className="gallery-form" aria-hidden="true">
      <Skeleton style={{ width: 180 }} />
      <Skeleton style={{ width: 260 }} />
      <Skeleton style={{ width: 120 }} />
    </div>
  );
}

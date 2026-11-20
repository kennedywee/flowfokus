import { LoadingState } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-fill">
      <LoadingState label="Loading sales" rows={3} />
    </div>
  );
}

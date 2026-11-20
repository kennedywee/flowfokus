import { Button } from "@/components/ui/button";
import { Money, Plate } from "@/components/ui";

export default function Example() {
  return (
    <div className="gallery-fill">
      <Plate
        title="Payments"
        action={<Button size="compact" variant="secondary">Record payment</Button>}
        footer={
          <p>
            Balance due <Money minor={12000} currency="MYR" />
          </p>
        }
      >
        <p>Cash · RM 80.00</p>
      </Plate>
    </div>
  );
}

import { CreditRing } from "@/components/parts/marks";

export default function Example() {
  return (
    <div className="gallery-row">
      <CreditRing left={10} total={10} />
      <CreditRing left={7} total={10} />
      <CreditRing left={2} total={10} />
      <CreditRing left={1} total={5} />
      <CreditRing left={0} total={10}>
        None left
      </CreditRing>
    </div>
  );
}

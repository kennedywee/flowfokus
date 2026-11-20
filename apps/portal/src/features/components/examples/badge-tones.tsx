import { Badge } from "@/components/ui/badge";

export default function Example() {
  return (
    <>
      <Badge tone="good">Paid</Badge>
      <Badge tone="warning">Part paid</Badge>
      <Badge tone="critical">Void</Badge>
      <Badge tone="info">Awaiting payment</Badge>
      <Badge tone="neutral">Draft</Badge>
    </>
  );
}

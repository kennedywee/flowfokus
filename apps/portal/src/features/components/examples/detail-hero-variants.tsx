import { DetailHero, HeroTile } from "@/components/parts/DetailLayout";
import { StatusMark } from "@/components/parts/marks";

export default function Example() {
  return (
    <div className="gallery-stack" style={{ gap: 32 }}>
      <DetailHero
        tile={<HeroTile initials="PN" />}
        title="Priya Nair"
        line="Member since Mar 2024, Bangsar"
        stats={[
          { value: "RM 2,000", label: "spent" },
          { value: "RM 0", label: "balance due" },
        ]}
      />
      <DetailHero tile={<HeroTile icon="sales" />} title="Sale #1058">
        <StatusMark kind="partlyPaid" tone="warning" boxed>Partly paid</StatusMark>
        <StatusMark kind="partlyFulfilled" tone="warning" boxed>Partly fulfilled</StatusMark>
      </DetailHero>
      <DetailHero
        size="display"
        title="Morning strength"
        line="Mondays, Wednesdays, Thursdays and Fridays at 07:00"
        stats={[{ value: "78%", label: "filled, last 4 weeks" }]}
      />
    </div>
  );
}

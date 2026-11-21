import { DetailHero, DetailLayout, HeroTile, PanelAddGroup, PanelGroup, PanelNote, PanelRow, PanelRows, PanelTags } from "@/components/parts/DetailLayout";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableRow } from "@/components/parts/ListTable";
import { ActivityFeed, Subject } from "@/components/parts/Activity";
import { TagChip, TimeMark } from "@/components/parts/marks";

export default function Example() {
  return (
    <div className="gallery-pane" style={{ minHeight: 0 }}>
      <DetailLayout
        record="member"
        panel={
          <>
            <PanelAddGroup title="Tags" addLabel="Add a tag" onAdd={() => {}}>
              <PanelTags>
                <TagChip tone="critical">Injury</TagChip>
                <TagChip tone="info">Corporate · Acme</TagChip>
              </PanelTags>
            </PanelAddGroup>
            <PanelGroup title="Details">
              <PanelRows>
                <PanelRow label="Email">priya.nair@example.com</PanelRow>
                <PanelRow label="Member since">Mar 2024</PanelRow>
                <PanelRow label="Location">Bangsar</PanelRow>
              </PanelRows>
            </PanelGroup>
            <PanelAddGroup title="Notes" addLabel="Add a note" onAdd={() => {}}>
              <PanelNote by="Kennedy · 28 Oct">Knee rehab — no box jumps until December.</PanelNote>
            </PanelAddGroup>
          </>
        }
      >
        <DetailHero
          tile={<HeroTile initials="PN" />}
          title="Priya Nair"
          line="Member since Mar 2024, Bangsar"
          stats={[
            { value: "RM 2,000", label: "spent" },
            { value: "RM 0", label: "balance due" },
          ]}
        />
        <section>
          <ListTable label="Memberships (sample data)" density="one-line" columns={[{ id: "plan", label: "Membership" }, { id: "state", label: "State", width: "200px" }]}>
            <ListTableBody>
              <ListTableRow>
                <ListTableCell>
                  <CellStack title="Monthly unlimited" />
                </ListTableCell>
                <ListTableCell>
                  <TimeMark fraction={0.7} tone="good">Renews in 29d</TimeMark>
                </ListTableCell>
              </ListTableRow>
            </ListTableBody>
          </ListTable>
        </section>
        <ActivityFeed
          items={[
            { kind: "event", id: "e1", tone: "neutral", time: "Today 07:42", children: <><Subject>Booked</Subject> Morning strength for Thu 5 Nov</> },
            { kind: "event", id: "e2", tone: "good", time: "Today 07:41", children: <>Sale <Subject>#1047</Subject> paid and fulfilled</> },
          ]}
        />
      </DetailLayout>
    </div>
  );
}

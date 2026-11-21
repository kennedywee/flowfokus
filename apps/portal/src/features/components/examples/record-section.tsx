import { useState } from "react";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableRow } from "@/components/parts/ListTable";
import { CreditRing, TimeMark } from "@/components/parts/marks";
import { Empty, Section } from "@/features/members/Section";

// Sample data.
export default function Example() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "grid", gap: 32, width: "100%", maxWidth: 792 }}>
      <Section id="gallery-holds" title="Holds (sample data)" more={{ open, onToggle: () => setOpen(!open) }}>
        <ListTable label="Holds" density="two-line" className="list-table--bare" columns={[{ id: "hold", label: "Hold" }, { id: "status", label: "Status", width: "200px", align: "end" }]}>
          <ListTableBody>
            <ListTableRow>
              <ListTableCell>
                <CellStack title="Monthly unlimited" sub="Membership, 3 Nov – 2 Dec" />
              </ListTableCell>
              <ListTableCell align="end" className="member-status">
                <TimeMark fraction={0.7} tone="good">Ends in 29d 16h</TimeMark>
              </ListTableCell>
            </ListTableRow>
            <ListTableRow>
              <ListTableCell>
                <CellStack title="10 group classes" sub="Access, 14 Oct – 14 Jan · All locations" />
              </ListTableCell>
              <ListTableCell align="end" className="member-status">
                <CreditRing left={3} total={10} />
              </ListTableCell>
            </ListTableRow>
          </ListTableBody>
        </ListTable>
      </Section>
      <Section id="gallery-empty" title="Bookings (sample data)">
        <Empty>No bookings yet.</Empty>
      </Section>
    </div>
  );
}

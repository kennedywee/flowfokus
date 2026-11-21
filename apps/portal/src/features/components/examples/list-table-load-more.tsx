import { useState } from "react";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableRow, LoadMore } from "@/components/parts/ListTable";
import { Tile } from "@/components/parts/marks";
import { SAMPLE_BOOKINGS } from "../sample";

const COLUMNS = [
  { id: "name", label: "Member" },
  { id: "plan", label: "Booked with", width: "180px" },
];

export default function Example() {
  const [count, setCount] = useState(3);
  return (
    <div className="gallery-fill">
      <ListTable label="Recent bookings (sample data)" density="one-line" columns={COLUMNS}>
        <ListTableBody>
          {SAMPLE_BOOKINGS.slice(0, count).map((booking) => (
            <ListTableRow key={booking.id}>
              <ListTableCell>
                <CellStack lead={<Tile size="small">{booking.initials}</Tile>} title={booking.name} />
              </ListTableCell>
              <ListTableCell className="cell-muted">{booking.plan}</ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
        <LoadMore loaded={count} done={count >= SAMPLE_BOOKINGS.length} onLoadMore={() => setCount((current) => Math.min(SAMPLE_BOOKINGS.length, current + 2))} />
      </ListTable>
    </div>
  );
}

import { useState } from "react";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableRow, SelectionAction, SelectionBar } from "@/components/parts/ListTable";
import { Tile } from "@/components/parts/marks";
import { rangeIds, toggleId } from "@/lib/list-parts";
import { SAMPLE_BOOKINGS } from "../sample";

const COLUMNS = [
  { id: "name", label: "Member" },
  { id: "plan", label: "Booked with", width: "180px" },
];

export default function Example() {
  const [chosen, setChosen] = useState<Set<string>>(new Set(["b3", "b4"]));
  const [anchor, setAnchor] = useState<string | null>("b3");
  const order = SAMPLE_BOOKINGS.map((booking) => booking.id);
  const choose = (id: string, on: boolean, range: boolean) => {
    if (range && anchor) {
      const ids = rangeIds(order, anchor, id);
      setChosen((current) => new Set(on ? [...current, ...ids] : [...current].filter((item) => !ids.includes(item))));
    } else {
      setChosen((current) => toggleId(current, id, on));
      setAnchor(id);
    }
  };
  return (
    <div className="gallery-fill">
      <ListTable
        label="Bookings (sample data)"
        density="one-line"
        columns={COLUMNS}
        selection={{
          chosen: chosen.size,
          total: order.length,
          onToggleAll: (on) => setChosen(on ? new Set(order) : new Set()),
        }}
      >
        <ListTableBody>
          {SAMPLE_BOOKINGS.map((booking) => (
            <ListTableRow
              key={booking.id}
              selected={chosen.has(booking.id)}
              unselectable={booking.group === "here"}
              selectLabel={`Choose ${booking.name}`}
              onSelectedChange={(on, { range }) => choose(booking.id, on, range)}
            >
              <ListTableCell>
                <CellStack lead={<Tile size="small">{booking.initials}</Tile>} title={booking.name} />
              </ListTableCell>
              <ListTableCell className="cell-muted">{booking.plan}</ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
      </ListTable>
      <SelectionBar count={chosen.size} onClear={() => setChosen(new Set())}>
        <SelectionAction icon="check" tone="good" onClick={() => setChosen(new Set())}>
          Check in
        </SelectionAction>
        <SelectionAction icon="close" tone="critical" onClick={() => setChosen(new Set())}>
          No-show
        </SelectionAction>
      </SelectionBar>
    </div>
  );
}

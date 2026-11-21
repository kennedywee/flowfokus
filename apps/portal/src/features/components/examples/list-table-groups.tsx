import { CellStack, ListGroup, ListTable, ListTableBody, ListTableCell, ListTableRow } from "@/components/parts/ListTable";
import { Icon, type IconName } from "@/components/ui/icon";
import { Tile } from "@/components/parts/marks";
import { SAMPLE_BOOKINGS, BOOKING_COLUMNS } from "../sample";

const GROUPS = [
  { id: "here", label: "Here", icon: "fulfilled" as IconName, tone: "good" },
  { id: "arrive", label: "To arrive", icon: "unfulfilled" as IconName, tone: "neutral" },
  { id: "cancelled", label: "Cancelled", icon: "close" as IconName, tone: "critical" },
];

export default function Example() {
  return (
    <div className="gallery-fill">
      <ListTable label="Bookings by arrival (sample data)" density="one-line" columns={BOOKING_COLUMNS}>
        {GROUPS.map((group) => {
          const rows = SAMPLE_BOOKINGS.filter((booking) => booking.group === group.id);
          return (
            <ListGroup
              key={group.id}
              label={group.label}
              count={rows.length}
              defaultOpen={group.id !== "cancelled"}
              mark={
                <span className="status-mark" data-tone={group.tone}>
                  <Icon name={group.icon} size={14} />
                </span>
              }
            >
              <ListTableBody>
                {rows.map((booking) => (
                  <ListTableRow key={booking.id}>
                    <ListTableCell>
                      <CellStack lead={<Tile size="small">{booking.initials}</Tile>} title={booking.name} />
                    </ListTableCell>
                    <ListTableCell className="cell-muted">{booking.plan}</ListTableCell>
                    <ListTableCell align="end" className="cell-muted">
                      {booking.when}
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListGroup>
          );
        })}
      </ListTable>
    </div>
  );
}

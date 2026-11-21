import { Button } from "@/components/ui/button";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableEmpty, ListTableLoading, ListTableRow } from "@/components/parts/ListTable";
import { Tile } from "@/components/parts/marks";
import { MEMBER_COLUMNS, SAMPLE_MEMBERS } from "../sample";

const COLUMNS = MEMBER_COLUMNS.slice(0, 3);
const [first, second, third] = SAMPLE_MEMBERS;

function Row({ member, ...props }: { member: NonNullable<typeof first>; selected?: boolean; demo?: "hover" | "focus"; band?: "alone" | "first" | "last" }) {
  return (
    <ListTableRow {...props}>
      <ListTableCell>
        <CellStack lead={<Tile>{member.initials}</Tile>} title={member.name} sub={member.code} />
      </ListTableCell>
      <ListTableCell className="cell-muted">{member.plan}</ListTableCell>
      <ListTableCell className="cell-muted">{member.since}</ListTableCell>
    </ListTableRow>
  );
}

export default function Example() {
  return (
    <div className="gallery-stack">
      <p className="gallery-caption">Default, hover, focus, and selected rows</p>
      <ListTable label="Row states (sample data)" columns={COLUMNS} sort={{ column: "name", direction: "asc" }} onSort={() => {}}>
        <ListTableBody>
          <Row member={first!} />
          <Row member={second!} demo="hover" />
          <Row member={third!} demo="focus" />
          <Row member={SAMPLE_MEMBERS[3]!} selected />
        </ListTableBody>
      </ListTable>
      <p className="gallery-caption">Loading</p>
      <ListTable label="Loading members (sample data)" columns={COLUMNS}>
        <ListTableLoading rows={3} label="Loading members" />
      </ListTable>
      <p className="gallery-caption">Empty</p>
      <ListTable label="No members (sample data)" columns={COLUMNS}>
        <ListTableEmpty title="No members yet" text="Members show here after you add one." action={<Button size="compact">New member</Button>} />
      </ListTable>
    </div>
  );
}

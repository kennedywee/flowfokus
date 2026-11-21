import { useMemo, useState } from "react";
import { ListPager } from "@/components/ListPager";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableRow } from "@/components/parts/ListTable";
import { TagChip, Tile, TimeMark } from "@/components/parts/marks";
import { nextSort, type SortState } from "@/lib/list-parts";
import { rangeLabel } from "@/lib/paging";
import { MEMBER_COLUMNS, SAMPLE_MEMBERS } from "../sample";

export default function Example() {
  const [sort, setSort] = useState<SortState | null>({ column: "name", direction: "asc" });
  const rows = useMemo(() => {
    const sorted = [...SAMPLE_MEMBERS];
    if (sort?.column === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort?.column === "spent") sorted.sort((a, b) => Number(a.spent.replace(/\D/g, "")) - Number(b.spent.replace(/\D/g, "")));
    if (sort?.column === "since") sorted.sort((a, b) => a.since.localeCompare(b.since));
    return sort?.direction === "desc" ? sorted.reverse() : sorted;
  }, [sort]);
  return (
    <div className="gallery-fill">
      <ListTable label="Members (sample data)" columns={MEMBER_COLUMNS} sort={sort} onSort={(next) => setSort(nextSort(sort, next.column))}>
        <ListTableBody>
          {rows.map((member) => (
            <ListTableRow key={member.id}>
              <ListTableCell>
                <CellStack
                  lead={<Tile>{member.initials}</Tile>}
                  title={member.name}
                  tags={member.tags?.map((tag) => (
                    <TagChip key={tag.label} tone={tag.tone}>
                      {tag.label}
                    </TagChip>
                  ))}
                  sub={`${member.code}`}
                />
              </ListTableCell>
              <ListTableCell>
                <span className="cell-stack__text">
                  <span>{member.plan}</span>
                  <TimeMark fraction={member.renews.left} tone={member.renews.tone}>
                    {member.renews.label}
                  </TimeMark>
                </span>
              </ListTableCell>
              <ListTableCell className="cell-muted">{member.since}</ListTableCell>
              <ListTableCell align="end" className="cell-figure">
                {member.spent}
              </ListTableCell>
              <ListTableCell align="end" className={member.due ? "cell-due" : "cell-faint"}>
                {member.due ?? "—"}
              </ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
      </ListTable>
      <ListPager label="Members pages" range={rangeLabel(1, 50, 186, "members")} page={1} pages={4} onPage={() => {}} />
    </div>
  );
}

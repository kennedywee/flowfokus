import { useMemo, useState } from "react";
import { ListPager } from "@/components/ListPager";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableRow } from "@/components/parts/ListTable";
import { TagChip, Tile, TimeMark } from "@/components/parts/marks";
import { nextSort, type SortState } from "@/lib/list-parts";
import { pageRange, rangeLabel } from "@/lib/paging";
import { MEMBER_COLUMNS, SAMPLE_MEMBERS, sortMembers } from "../sample";

/** A small page, so the sample data has more than one. */
const PAGE = 4;

export default function Example() {
  const [sort, setSort] = useState<SortState | null>({ column: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => sortMembers(SAMPLE_MEMBERS, sort), [sort]);
  const { from, to, pages } = pageRange(page, PAGE, sorted.length);
  const rows = sorted.slice(from - 1, to);
  return (
    <div className="gallery-fill">
      <ListTable
        label="Members (sample data)"
        columns={MEMBER_COLUMNS}
        sort={sort}
        onSort={(next) => {
          setSort(nextSort(sort, next.column));
          setPage(1);
        }}
      >
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
      <ListPager label="Members pages" range={rangeLabel(page, PAGE, sorted.length, "members")} page={page} pages={pages} onPage={setPage} />
    </div>
  );
}

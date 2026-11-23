import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { ListPager } from "../../components/ListPager";
import { SearchField, useSetListSearch } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { RecordBackdrop } from "@/components/parts/Backdrop";
import { HeroStats } from "@/components/parts/DetailLayout";
import { DisplayPopover, FilterBar } from "@/components/parts/FilterBar";
import {
  CellStack,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableEmpty,
  ListTableLoading,
  ListTableRow,
  type ListColumn,
} from "@/components/parts/ListTable";
import { TagChip, Tile } from "@/components/parts/marks";
import { Kbd, initials } from "../../components/ui";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useCan, useLocationName, useOrganization } from "../../lib/organization";
import { PAGE_SIZE, pageRange, rangeLabel } from "../../lib/paging";
import type { Failure, Result } from "../../lib/result";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ActiveFilter, SortState } from "@/lib/list-parts";
import {
  DEFAULT_PROGRAM_COLUMNS,
  DEFAULT_PROGRAM_SORT,
  PROGRAM_SORT_FIELDS,
  activeFilters,
  filterFromSearch,
  filterPrograms,
  isDefaultDisplay,
  lengthText,
  programCounts,
  programFilterFields,
  searchFromFilters,
  sortPrograms,
  upcomingText,
  type ProgramColumnId,
  type ProgramsSearch,
} from "./facts";
import { KindTile } from "./kinds";

type Program = Schemas["ProgramListItem"];


/** The first column, and Host and Upcoming when the Display popover has them on. */
function programColumns(columns: Record<ProgramColumnId, boolean>): ListColumn[] {
  return [
    { id: "name", label: "Program", sortable: true },
    ...(columns.host ? [{ id: "host", label: "Host", width: "176px", sortable: true }] : []),
    ...(columns.upcoming ? [{ id: "upcoming", label: "Upcoming", width: "104px", align: "end" as const, sortable: true }] : []),
  ];
}

/**
 * The programs list (Paper "Members" pattern, issue #92): the title with the
 * program count, New program in the top bar, a filter bar (Kind, Visibility,
 * and search over names and hosts, with Display), the list table, and the
 * page range. Rails returns every program of the organization; the list
 * filters, sorts, and pages here. The URL keeps the filters and the search.
 */
export function ProgramsList({ programs, search }: { programs: Result<Program[]>; search: ProgramsSearch }) {
  return (
    <div className="page programs-list">
      <RecordBackdrop record="program" />
      <ListHead count={programs.ok ? String(programs.data.length) : null} />
      {programs.ok ? (
        <Loaded programs={programs.data} search={search} />
      ) : (
        <>
          <Bar search={search} programs={null} />
          <ListTable label="Programs" columns={programColumns(DEFAULT_PROGRAM_COLUMNS)} className="programs-table">
            <DidNotLoad error={programs.error} />
          </ListTable>
        </>
      )}
    </div>
  );
}

function ListHead({ count }: { count: string | null }) {
  return (
    <header className="programs-head">
      <h1>Programs</h1>
      {count !== null ? <HeroStats stats={[{ value: count, label: Number(count) === 1 ? "program" : "programs" }]} /> : null}
      <PageActions>
        <NewProgramLink shortcut />
      </PageActions>
    </header>
  );
}

/** `shortcut` adds the N key and its hint. Only the top bar action has it, so the key is bound once. */
function NewProgramLink({ variant = "default", shortcut = false }: { variant?: "default" | "secondary"; shortcut?: boolean }) {
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  const canCreate = can("programs:manage");
  useShortcut("n", () => void navigate({ to: "/$org/programs/new", params: { org: organization.slug } }), {
    enabled: shortcut && canCreate,
  });
  if (!canCreate) return null;
  return (
    <Link
      to="/$org/programs/new"
      params={{ org: organization.slug }}
      className={buttonVariants({ variant, size: "compact" })}
      aria-keyshortcuts={shortcut ? "N" : undefined}
    >
      New program
      {shortcut ? <Kbd>N</Kbd> : null}
    </Link>
  );
}

/**
 * Filter, one chip per active filter, search, and Display. The chips change the
 * URL, so Back and reload keep them. Without the programs (the list did not
 * load) the Filter button is left out.
 */
function Bar({ search, programs, display }: { search: ProgramsSearch; programs: Program[] | null; display?: ReactNode }) {
  const setSearch = useSetListSearch("/$org/programs", search, ["kind", "kind_not", "visibility", "visibility_not", "q"]);
  const filter = filterFromSearch(search);
  return (
    <FilterBar
      fields={programs ? programFilterFields(programCounts(programs)) : []}
      filters={activeFilters(filter)}
      onChange={(next: ActiveFilter[]) => {
        const { kind, kind_not, visibility, visibility_not } = searchFromFilters(next);
        setSearch({ kind, kind_not, visibility, visibility_not });
      }}
      search={
        <SearchField
          id="program-search"
          label="Search programs by name or host"
          placeholder="Search name or host"
          q={search.q ?? ""}
          onSearch={(q) => setSearch({ q: q || undefined })}
          delay={300}
        />
      }
      display={display}
    />
  );
}

function Loaded({ programs, search }: { programs: Program[]; search: ProgramsSearch }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const filter = filterFromSearch(search);
  const q = search.q ?? "";
  const [sort, setSort] = useState<SortState>(DEFAULT_PROGRAM_SORT);
  const [columns, setColumns] = useState(DEFAULT_PROGRAM_COLUMNS);
  const [chosenPage, setPage] = useState(1);
  // A new filter or search starts again at page 1.
  const key = `${filter.kindNot ? "!" : ""}${filter.kind.join()}|${filter.visibilityNot ? "!" : ""}${filter.visibility.join()}|${q}`;
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setPage(1);
  }
  const requested = lastKey === key ? chosenPage : 1;
  const shown = useMemo(() => sortPrograms(filterPrograms(programs, filter, q), sort), [programs, key, sort]);
  const { from, to, pages } = pageRange(requested, PAGE_SIZE, shown.length);
  const page = Math.min(requested, pages);
  const rows = shown.slice(Math.max(from - 1, 0), to);
  const manyLocations = organization.locations.length > 1;
  const set = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  const display = (
    <DisplayPopover
      sortFields={PROGRAM_SORT_FIELDS}
      sort={sort}
      onSort={set}
      columns={[
        { id: "host", label: "Host", on: columns.host },
        { id: "upcoming", label: "Upcoming", on: columns.upcoming },
      ]}
      onColumn={(id, on) => setColumns((current) => ({ ...current, [id as ProgramColumnId]: on }))}
      isDefault={isDefaultDisplay(sort, columns)}
      onReset={() => {
        set(DEFAULT_PROGRAM_SORT);
        setColumns(DEFAULT_PROGRAM_COLUMNS);
      }}
    />
  );

  return (
    <>
      <Bar search={search} programs={programs} display={programs.length ? display : undefined} />
      <ListTable label="Programs" columns={programColumns(columns)} sort={sort} onSort={set} className="programs-table">
        {rows.length ? (
          <ListTableBody>
            {rows.map((program) => (
              <ListTableRow key={program.id}>
                <ListTableCell>
                  <Link
                    to="/$org/programs/$programId"
                    params={{ org: organization.slug, programId: program.id }}
                    className="list-table__link"
                  >
                    <CellStack
                      lead={<KindTile kind={program.kind} />}
                      title={program.name}
                      tags={program.published ? null : <TagChip>Staff only</TagChip>}
                      sub={[PROGRAM_KIND_LABEL[program.kind], lengthText(program.duration_minutes), manyLocations ? locationName(program.location_id) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </Link>
                </ListTableCell>
                {columns.host ? (
                  <ListTableCell className="programs-table__host">
                    {program.host_name ? (
                      <>
                        <Tile size="small">{initials(program.host_name).slice(0, 1)}</Tile>
                        <span>{program.host_name}</span>
                      </>
                    ) : (
                      <span className="cell-faint">No host</span>
                    )}
                  </ListTableCell>
                ) : null}
                {columns.upcoming ? (
                  <ListTableCell align="end" className="cell-muted programs-table__upcoming">
                    {upcomingText(program.upcoming_count)}
                  </ListTableCell>
                ) : null}
              </ListTableRow>
            ))}
          </ListTableBody>
        ) : programs.length ? (
          <NoMatch q={q} filtered={Boolean(filter.kind.length || filter.visibility.length)} />
        ) : (
          <NoPrograms />
        )}
      </ListTable>
      {rows.length ? (
        <ListPager
          label="Program pages"
          range={rangeLabel(page, PAGE_SIZE, shown.length, "programs")}
          page={page}
          pages={pages}
          onPage={setPage}
        />
      ) : null}
    </>
  );
}

function NoPrograms() {
  const can = useCan();
  return (
    <ListTableEmpty
      title="No programs yet"
      text={can("programs:manage") ? "Classes and open-gym sessions you add show up here." : "A manager adds programs."}
      action={<NewProgramLink variant="secondary" />}
    />
  );
}

function NoMatch({ q, filtered }: { q: string; filtered: boolean }) {
  const navigate = useNavigate();
  const organization = useOrganization();
  return (
    <ListTableEmpty
      title={q ? `No programs match “${q}”` : "No programs match these filters"}
      action={
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={() => void navigate({ to: "/$org/programs", params: { org: organization.slug }, search: {}, replace: true })}
        >
          {q && !filtered ? "Clear search" : "Clear filters"}
        </Button>
      }
    />
  );
}

function DidNotLoad({ error }: { error: Failure }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <ListTableEmpty
      title="Programs did not load"
      text={failureMessage(error)}
      action={
        <Button
          type="button"
          variant="secondary"
          size="compact"
          disabled={retrying}
          aria-busy={retrying || undefined}
          onClick={async () => {
            setRetrying(true);
            await router.invalidate();
            setRetrying(false);
          }}
        >
          Try again
        </Button>
      }
    />
  );
}

/** Keeps the list shape while programs load. */
export function ProgramsLoading() {
  return (
    <div className="page programs-list">
      <RecordBackdrop record="program" />
      <ListHead count={null} />
      <div className="filter-bar" aria-hidden="true">
        <span className="skeleton-block programs-list__skeleton-button" />
        <span className="filter-bar__space" />
        <span className="list-search skeleton-block" />
      </div>
      <ListTable label="Programs" columns={programColumns(DEFAULT_PROGRAM_COLUMNS)} className="programs-table">
        <ListTableLoading rows={8} label="Loading programs" />
      </ListTable>
    </div>
  );
}

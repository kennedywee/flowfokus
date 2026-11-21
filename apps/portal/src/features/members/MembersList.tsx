import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { ListPager } from "../../components/ListPager";
import { SearchField, useSetListSearch } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { DisplayPopover, FilterBar } from "@/components/parts/FilterBar";
import { HeroStats } from "@/components/parts/DetailLayout";
import { RecordBackdrop } from "@/components/parts/Backdrop";
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
import { Tile } from "@/components/parts/marks";
import { FailureNotice, Kbd, initials } from "../../components/ui";
import type { Result } from "../../lib/result";
import { useCan, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { buttonVariants } from "@/components/ui/button";
import type { SortState } from "@/lib/list-parts";
import { PAGE_SIZE, pageRange, rangeLabel } from "../../lib/paging";
import { useShortDate } from "./dates";
import {
  DEFAULT_MEMBER_COLUMNS,
  DEFAULT_MEMBER_SORT,
  MEMBER_SORT_FIELDS,
  isDefaultDisplay,
  sortMembers,
  type MemberColumnId,
} from "./list";

const icon = { "aria-hidden": true, focusable: false } as const;

/** The first column, and Member since when the Display popover has it on. */
function memberColumns(since: boolean): ListColumn[] {
  return [
    { id: "name", label: "Member", sortable: true },
    ...(since ? [{ id: "since", label: "Member since", width: "110px", sortable: true }] : []),
  ];
}

/**
 * The members list (Paper "Members"): the title with the member count, a bar
 * with search and Display, the list table, and the page range. Rails searches
 * by name or email (`q`) and returns every match, newest first. Sorting,
 * columns, and paging happen here, on the rows Rails returned.
 */
/** Rails returns at most this many members (Staff::MembersController). A full page means there may be more. */
const MEMBER_LIMIT = 200;

export function MembersList({ members, q }: { members: Result<Schemas["Member"][]>; q?: string }) {
  const search = q ?? "";
  return (
    <div className="page members-list">
      <RecordBackdrop record="member" />
      <ListHead count={members.ok && !search ? countLabel(members.data.length) : null} />
      {members.ok ? (
        <MemberList members={members.data} q={search} />
      ) : (
        <>
          <Bar q={search} />
          <ListTable label="Members" columns={memberColumns(true)}>
            <FailureNotice error={members.error} title="Members did not load" />
          </ListTable>
        </>
      )}
    </div>
  );
}

/**
 * The title, and the member count on the right. A search shows no count: Rails
 * returns only the matches, so the count of all members is not known then.
 */
function ListHead({ count }: { count: string | null }) {
  return (
    <header className="members-head">
      <h1>Members</h1>
      {count !== null ? <HeroStats stats={[{ value: count, label: "members" }]} /> : null}
      <PageActions>
        <NewMemberLink shortcut />
      </PageActions>
    </header>
  );
}

/** `shortcut` adds the N key and its hint. Only the top bar action has it, so the key is bound once. */
function NewMemberLink({ variant = "default", shortcut = false }: { variant?: "default" | "secondary"; shortcut?: boolean }) {
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  // A new member opens on its record, which needs members:read.
  const canCreate = can("members:create") && can("members:read");
  useShortcut("n", () => void navigate({ to: "/$org/members/new", params: { org: organization.slug } }), {
    enabled: shortcut && canCreate,
  });
  if (!canCreate) return null;
  return (
    <Link
      to="/$org/members/new"
      params={{ org: organization.slug }}
      className={buttonVariants({ variant, size: "compact" })}
      aria-keyshortcuts={shortcut ? "N" : undefined}
    >
      <Icon name="plus" {...icon} />
      New member
      {shortcut ? <Kbd>N</Kbd> : null}
    </Link>
  );
}

/**
 * The filter bar. Rails has no member filters yet (issue #17), so it has no
 * Filter button: search on the right, and Display when the list has rows.
 */
function Bar({ q, display }: { q: string; display?: ReactNode }) {
  const setSearch = useSetListSearch("/$org/members", { q }, ["q"]);
  return (
    <FilterBar
      fields={[]}
      filters={[]}
      onChange={() => {}}
      search={
        <SearchField
          id="member-search"
          label="Search members by name or email"
          placeholder="Search name or email"
          q={q}
          onSearch={(next) => setSearch({ q: next || undefined })}
          delay={300}
        />
      }
      display={display}
    />
  );
}

function MemberList({ members, q }: { members: Schemas["Member"][]; q: string }) {
  const organization = useOrganization();
  const shortDate = useShortDate();
  const [sort, setSort] = useState<SortState>(DEFAULT_MEMBER_SORT);
  const [columns, setColumns] = useState(DEFAULT_MEMBER_COLUMNS);
  const [chosenPage, setPage] = useState(1);
  // A new search, or clearing one, starts on the first page.
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) {
    setLastQ(q);
    setPage(1);
  }
  const requested = lastQ === q ? chosenPage : 1;
  const sorted = useMemo(() => sortMembers(members, sort), [members, sort]);
  const { from, to, pages } = pageRange(requested, PAGE_SIZE, sorted.length);
  const page = Math.min(requested, pages);
  const rows = sorted.slice(Math.max(from - 1, 0), to);
  const set = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  const display = (
    <DisplayPopover
      sortFields={MEMBER_SORT_FIELDS}
      sort={sort}
      onSort={set}
      columns={[
        { id: "since", label: "Member since", on: columns.since },
        { id: "email", label: "Email", on: columns.email },
      ]}
      onColumn={(id, on) => setColumns((current) => ({ ...current, [id as MemberColumnId]: on }))}
      isDefault={isDefaultDisplay(sort, columns)}
      onReset={() => {
        set(DEFAULT_MEMBER_SORT);
        setColumns(DEFAULT_MEMBER_COLUMNS);
      }}
    />
  );

  return (
    <>
      <Bar q={q} display={display} />
      <ListTable label="Members" columns={memberColumns(columns.since)} sort={sort} onSort={set}>
        {rows.length ? (
          <ListTableBody>
            {rows.map((member) => (
              <ListTableRow key={member.id}>
                <ListTableCell>
                  <Link
                    to="/$org/members/$memberId"
                    params={{ org: organization.slug, memberId: member.id }}
                    className="list-table__link"
                  >
                    <CellStack lead={<Tile>{initials(member.name)}</Tile>} title={member.name} sub={columns.email ? member.email : undefined} />
                  </Link>
                </ListTableCell>
                {columns.since ? (
                  <ListTableCell className="cell-muted">
                    <time dateTime={member.created_at} suppressHydrationWarning>
                      {shortDate(member.created_at)}
                    </time>
                  </ListTableCell>
                ) : null}
              </ListTableRow>
            ))}
          </ListTableBody>
        ) : q ? (
          <NoResults q={q} />
        ) : (
          <ListTableEmpty title="No members yet" text="Members you add or who join online show up here." action={<NewMemberLink variant="secondary" />} />
        )}
      </ListTable>
      {rows.length ? (
        <ListPager
          label="Members pages"
          range={rangeLabel(page, PAGE_SIZE, sorted.length, sorted.length >= MEMBER_LIMIT ? "members shown" : "members")}
          page={page}
          pages={pages}
          onPage={setPage}
        />
      ) : null}
    </>
  );
}

function NoResults({ q }: { q: string }) {
  const organization = useOrganization();
  return (
    <ListTableEmpty
      title={`No members match “${q}”`}
      action={
        <Link to="/$org/members" params={{ org: organization.slug }} search={{}} className={buttonVariants({ variant: "secondary", size: "compact" })}>
          Clear search
        </Link>
      }
    />
  );
}

/** Keeps the list shape while members load. */
export function MembersListLoading() {
  return (
    <div className="page members-list">
      <RecordBackdrop record="member" />
      <ListHead count={null} />
      <div className="filter-bar" aria-hidden="true">
        <span className="filter-bar__space" />
        <span className="list-search skeleton-block" />
      </div>
      <ListTable label="Members" columns={memberColumns(true)}>
        <ListTableLoading rows={8} label="Loading members" />
      </ListTable>
    </div>
  );
}

/** The member count. At Rails' limit it reads "200+", because more may exist. */
function countLabel(count: number): string {
  return count >= MEMBER_LIMIT ? `${MEMBER_LIMIT}+` : String(count);
}

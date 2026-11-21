import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { ListPager } from "../../components/ListPager";
import { ListToolbar, ListToolbarLoading, SearchField, useSetListSearch } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { TableState } from "../../components/TableState";
import { FailureNotice, Kbd, initials } from "../../components/ui";
import type { Result } from "../../lib/result";
import { useCan, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { buttonVariants } from "@/components/ui/button";
import { useShortDate } from "./dates";
import { PAGE_SIZE } from "../../lib/paging";
import { rangeLabel } from "./list";

const icon = { "aria-hidden": true, focusable: false } as const;

/**
 * The members list: search, then one row per member with the join date.
 * Rails searches by name or email and returns members newest first.
 */
export function MembersList({ members, q }: { members: Result<Schemas["Member"][]>; q?: string }) {
  return (
    <div className="page members-list">
      <ListHead />
      <Toolbar q={q ?? ""} />
      {members.ok ? (
        members.data.length ? (
          <MemberRows key={q ?? ""} members={members.data} />
        ) : q ? (
          <NoResults q={q} />
        ) : (
          <NoMembers />
        )
      ) : (
        <FailureNotice error={members.error} title="Members did not load" />
      )}
    </div>
  );
}

function ListHead() {
  return (
    <header className="members-head">
      <h1>Members</h1>
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

function Toolbar({ q }: { q: string }) {
  const setSearch = useSetListSearch("/$org/members", { q }, ["q"]);
  return (
    <ListToolbar
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
    />
  );
}

function MemberRows({ members }: { members: Schemas["Member"][] }) {
  const organization = useOrganization();
  const shortDate = useShortDate();
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const first = (page - 1) * PAGE_SIZE;
  const rows = members.slice(first, first + PAGE_SIZE);

  return (
    <section className="members-table" aria-label="Members">
      <MembersHead />
      <ul className="members-rows">
        {rows.map((member) => (
          <li key={member.id}>
            <Link
              to="/$org/members/$memberId"
              params={{ org: organization.slug, memberId: member.id }}
              className="members-row"
            >
              <span className="members-row__avatar" aria-hidden="true">
                {initials(member.name)}
              </span>
              <span className="members-row__main">
                <span className="members-row__name">{member.name}</span>
                <span className="members-row__email">{member.email}</span>
              </span>
              <span className="members-row__joined">
                <span className="visually-hidden">Joined </span>
                <time dateTime={member.created_at} suppressHydrationWarning>
                  {shortDate(member.created_at)}
                </time>
              </span>
              <Icon name="chevronRight" className="members-row__chevron" {...icon} />
            </Link>
          </li>
        ))}
      </ul>
      <ListPager
        label="Members pages"
        range={rangeLabel(first, rows.length, members.length)}
        page={page}
        pages={pages}
        onPage={setPage}
      />
    </section>
  );
}

/** Column titles for sighted staff. Each row link reads its own facts. */
function MembersHead() {
  return (
    <div className="members-table__head" aria-hidden="true">
      <span className="members-table__member">Member</span>
      <span className="members-table__joined">Joined</span>
      <span className="members-table__chevron" />
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  const organization = useOrganization();
  return (
    <TableState
      title={`No members match “${q}”`}
      action={
        <Link
          to="/$org/members"
          params={{ org: organization.slug }}
          search={{}}
          className={buttonVariants({ variant: "secondary", size: "compact" })}
        >
          Clear search
        </Link>
      }
    />
  );
}

function NoMembers() {
  return (
    <TableState
      className="members-table"
      head={<MembersHead />}
      title="No members yet"
      text="Members you add or who join online show up here."
      action={<NewMemberLink variant="secondary" />}
    />
  );
}

/** Keeps the list shape while members load. */
export function MembersListLoading() {
  return (
    <div className="page members-list" role="status" aria-busy="true" aria-label="Loading members">
      <ListHead />
      <ListToolbarLoading filter={false} />
      <div className="members-table">
        <div className="members-table__head" />
        <div className="members-rows">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="members-row">
              <span className="members-row__avatar skeleton-block" />
              <span className="members-row__main">
                <span className="skeleton-line" style={{ width: `${40 - index * 2}%` }} />
                <span className="skeleton-line skeleton-line--small" style={{ width: `${28 - index}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

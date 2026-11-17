import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { ListPager } from "../../components/ListPager";
import { FailureNotice, Kbd, initials } from "../../components/ui";
import type { Result } from "../../lib/result";
import { useCan, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { buttonVariants } from "@/components/ui/button";
import { useShortDate } from "./dates";
import { PAGE_SIZE } from "../../lib/paging";
import { rangeLabel } from "./list";

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

/**
 * The members list: search, then one row per member with the join date.
 * Rails searches by name or email and returns members newest first.
 */
export function MembersList({ members, q }: { members: Result<Schemas["Member"][]>; q?: string }) {
  return (
    <div className="page members-list">
      <ListHead />
      <div className="members-toolbar">
        <SearchField q={q ?? ""} />
      </div>
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
      <NewMemberLink />
    </header>
  );
}

function NewMemberLink({ variant = "default" }: { variant?: "default" | "secondary" }) {
  const organization = useOrganization();
  const can = useCan();
  if (!can("members:create")) return null;
  return (
    <Link to="/$org/members/new" params={{ org: organization.slug }} className={buttonVariants({ variant, size: "compact" })}>
      <Plus {...icon} />
      New member
    </Link>
  );
}

/**
 * Searches as staff type, after a short pause, and at once on Enter. "/"
 * focuses it. The URL holds the search, so Back and reload keep it.
 */
function SearchField({ q }: { q: string }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(q);
  useShortcut("/", () => input.current?.focus());

  // A search from elsewhere, such as "Clear search", replaces the typed text.
  useEffect(() => {
    setValue((current) => (current.trim() === q ? current : q));
  }, [q]);

  function search(next: string) {
    const trimmed = next.trim();
    if (trimmed === q) return;
    void navigate({
      to: "/$org/members",
      params: { org: organization.slug },
      search: trimmed ? { q: trimmed } : {},
      replace: true,
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => search(value), 300);
    return () => window.clearTimeout(timer);
    // `search` reads the latest q and value; only typing restarts the pause.
  }, [value]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(value);
  }

  return (
    <form role="search" className="list-search" onSubmit={onSubmit}>
      <label htmlFor="member-search" className="visually-hidden">
        Search members by name or email
      </label>
      <Search className="list-search__icon" {...icon} />
      <input
        ref={input}
        id="member-search"
        className="list-search__input"
        type="search"
        placeholder="Search name or email"
        autoComplete="off"
        maxLength={200}
        aria-keyshortcuts="/"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            search("");
          }
        }}
      />
      <Kbd>/</Kbd>
    </form>
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
      {/* Column titles for sighted staff. Each row link reads its own facts. */}
      <div className="members-table__head" aria-hidden="true">
        <span className="members-table__member">Member</span>
        <span className="members-table__joined">Joined</span>
        <span className="members-table__chevron" />
      </div>
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
              <ChevronRight className="members-row__chevron" {...icon} />
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

function NoResults({ q }: { q: string }) {
  const organization = useOrganization();
  return (
    <div className="list-state" role="status">
      <p>No members match “{q}”</p>
      <Link
        to="/$org/members"
        params={{ org: organization.slug }}
        search={{}}
        className={buttonVariants({ variant: "secondary", size: "compact" })}
      >
        Clear search
      </Link>
    </div>
  );
}

function NoMembers() {
  return (
    <div className="list-state">
      <Users className="list-state__icon" {...icon} />
      <p>No members yet</p>
      <NewMemberLink variant="secondary" />
    </div>
  );
}

/** Keeps the list shape while members load. */
export function MembersListLoading() {
  return (
    <div className="page members-list" role="status" aria-busy="true" aria-label="Loading members">
      <ListHead />
      <div className="members-toolbar">
        <span className="list-search skeleton-block" />
      </div>
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

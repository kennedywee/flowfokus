import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { ChevronRight, Download, ListFilter, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { PageActions } from "../../components/PageActions";
import { TableState } from "../../components/TableState";
import { Kbd, initials } from "../../components/ui";
import { downloadCsv } from "../../lib/export";
import { failureMessage } from "../../lib/format";
import { useCan, useLocationName, useOrganization } from "../../lib/organization";
import type { Failure, Result } from "../../lib/result";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeniedMark, GrantedMark, useCheckIn } from "./CheckInFlow";
import {
  RESULT_FILTERS,
  clockTime,
  filterCheckIns,
  noMatchText,
  readResults,
  resultCounts,
  resultText,
  todayCountText,
  todayOnly,
  type CheckInResult,
  type CheckInsSearch,
} from "./facts";
import { FindMemberDialog, FindMemberInline } from "./FindMember";

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

/**
 * Check-ins: today's visits, newest first, and Check in. Choosing a member in
 * the search checks them in at the top bar location. Rails decides each
 * result; the list shows it with the reason Rails gives.
 */
export function CheckIns({
  visits,
  overview,
  search,
}: {
  visits: Result<Schemas["CheckIn"][]>;
  overview: Result<Schemas["StaffOverview"]>;
  search: CheckInsSearch;
}) {
  const can = useCan();
  const flow = useCheckIn();
  const [finding, setFinding] = useState(false);
  const canRead = can("check_ins:read");
  const canCreate = can("check_ins:create");
  const forbidden = !canRead || (!visits.ok && visits.error.code === "forbidden");

  return (
    <div className="page checkins-page">
      <header className="checkins-head">
        <h1>Check-ins</h1>
        <PageActions>
          {canCreate ? (
            <Button type="button" size="compact" className="checkins-head__check-in" aria-haspopup="dialog" onClick={() => setFinding(true)}>
              <Plus {...icon} />
              Check in
            </Button>
          ) : null}
          {!forbidden && visits.ok ? <MoreMenu visits={visits.data} search={search} /> : null}
        </PageActions>
      </header>
      {canCreate ? (
        <>
          <div className="checkins-find">
            <FindMemberInline hasLocation={flow.hasLocation} onPick={(member) => void flow.checkIn(member)} />
          </div>
          <FindMemberDialog
            open={finding}
            onOpenChange={setFinding}
            hasLocation={flow.hasLocation}
            onPick={(member) => void flow.checkIn(member)}
          />
          {flow.dialog}
        </>
      ) : null}
      {forbidden ? (
        <div className="list-state checkins-state" role="status">
          <p>Your role can't see check-ins</p>
          <p className="checkins-state__text">Ask an owner for check-in access (check_ins:read).</p>
        </div>
      ) : visits.ok ? (
        <Today visits={visits.data} overview={overview} search={search} />
      ) : (
        <DidNotLoad error={visits.error} />
      )}
    </div>
  );
}

/** ⋯ in the top bar: Export visits as CSV, with the list's filters. */
function MoreMenu({ visits, search }: { visits: Schemas["CheckIn"][]; search: CheckInsSearch }) {
  const locationName = useLocationName();
  const exportVisits = () => {
    const rows = filterCheckIns(visits, readResults(search.result), search.q ?? "");
    downloadCsv("check-ins.csv", [
      ["Member", "Location", "Time", "Result"],
      ...rows.map((visit) => [visit.member.name, locationName(visit.location_id), visit.checked_in_at, resultText(visit)]),
    ]);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions">
        <MoreHorizontal {...icon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportVisits}>
          <Download {...icon} />
          Export visits as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Today({
  visits,
  overview,
  search,
}: {
  visits: Schemas["CheckIn"][];
  overview: Result<Schemas["StaffOverview"]>;
  search: CheckInsSearch;
}) {
  const organization = useOrganization();
  const today = todayOnly(visits, organization.timezone);
  const results = readResults(search.result);
  const q = search.q ?? "";
  const shown = filterCheckIns(today, results, q);

  if (!today.length) {
    return (
      <TableState
        className="checkins-table"
        head={<CheckInsHead />}
        grid="checkins-grid"
        cells={["text", "avatar", "text", "blank"]}
        title="No check-ins yet today"
        text="Members who check in today show up here."
      />
    );
  }

  return (
    <>
      <Toolbar today={today} results={results} search={search} />
      {shown.length ? (
        <CheckInRows checkIns={shown} />
      ) : (
        <NoMatch results={results} q={q} />
      )}
      {overview.ok ? <p className="checkins-foot">{todayCountText(overview.data.check_ins_today)}</p> : null}
    </>
  );
}

/** Updates the list URL, so Back and reload keep the filter and the search. */
function useSetSearch(current: CheckInsSearch) {
  const organization = useOrganization();
  const navigate = useNavigate();
  return (next: Partial<CheckInsSearch>) => {
    const merged = { ...current, ...next };
    const clean: CheckInsSearch = {};
    if (merged.result) clean.result = merged.result;
    if (merged.q) clean.q = merged.q;
    void navigate({ to: "/$org/check-in", params: { org: organization.slug }, search: clean, replace: true });
  };
}

function Toolbar({ today, results, search }: { today: Schemas["CheckIn"][]; results: CheckInResult[]; search: CheckInsSearch }) {
  const setSearch = useSetSearch(search);
  const counts = resultCounts(today);
  const toggle = (value: CheckInResult, on: boolean) => {
    const next = new Set(results);
    if (on) next.add(value);
    else next.delete(value);
    setSearch({ result: RESULT_FILTERS.map((item) => item.value).filter((item) => next.has(item)).join(",") || undefined });
  };
  const chosen = RESULT_FILTERS.filter((item) => results.includes(item.value)).map((item) => item.label);

  return (
    <div className="checkins-toolbar">
      <div className="checkins-toolbar__filters">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
            <ListFilter {...icon} />
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="sales-filter-menu">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Result
                <DropdownMenuShortcut>
                  <ChevronRight {...icon} />
                </DropdownMenuShortcut>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="sales-filter-menu">
                {RESULT_FILTERS.map((item) => (
                  <DropdownMenuCheckboxItem
                    key={item.value}
                    checked={results.includes(item.value)}
                    onCheckedChange={(on) => toggle(item.value, on)}
                  >
                    {item.value === "granted" ? <GrantedMark /> : <DeniedMark size={14} />}
                    {item.label}
                    <DropdownMenuShortcut className="sales-filter-menu__count">{counts[item.value]}</DropdownMenuShortcut>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        {chosen.length ? (
          <span className="filter-chip">
            <span className="filter-chip__part filter-chip__name">Result</span>
            <span className="filter-chip__part filter-chip__op">{chosen.length > 1 ? "is any of" : "is"}</span>
            <span className="filter-chip__part filter-chip__values">{chosen.join(", ")}</span>
            <button
              type="button"
              className="filter-chip__clear"
              aria-label="Clear the result filter"
              onClick={() => setSearch({ result: undefined })}
            >
              <X {...icon} />
            </button>
          </span>
        ) : null}
      </div>
      <SearchField q={search.q ?? ""} onSearch={(q) => setSearch({ q: q || undefined })} />
    </div>
  );
}

/** Filters as staff type, after a short pause. "/" focuses it; Escape clears it. */
function SearchField({ q, onSearch }: { q: string; onSearch: (q: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(q);
  useShortcut("/", () => input.current?.focus());

  useEffect(() => {
    setValue((current) => (current.trim() === q ? current : q));
  }, [q]);

  const search = (next: string) => {
    if (next.trim() !== q) onSearch(next.trim());
  };

  useEffect(() => {
    const timer = window.setTimeout(() => search(value), 250);
    return () => window.clearTimeout(timer);
    // Only typing restarts the pause.
  }, [value]);

  return (
    <form
      role="search"
      className="list-search checkins-toolbar__search"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        search(value);
      }}
    >
      <label htmlFor="check-in-search" className="visually-hidden">
        Search today's check-ins by member
      </label>
      <Search className="list-search__icon" {...icon} />
      <input
        ref={input}
        id="check-in-search"
        className="list-search__input"
        type="search"
        placeholder="Search members"
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

function CheckInRows({ checkIns }: { checkIns: Schemas["CheckIn"][] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const showLocation = organization.locations.length > 1;
  return (
    <section className="checkins-table" aria-label="Today's check-ins" data-locations={showLocation || undefined}>
      {/* Column titles for sighted staff. Each row link reads its own facts. */}
      <div className="checkins-table__head checkins-grid" aria-hidden="true">
        <span>Time</span>
        <span>Member</span>
        {showLocation ? <span className="checkins-col--location">Location</span> : null}
        <span>Result</span>
        <span />
      </div>
      <ul className="checkins-rows">
        {checkIns.map((checkIn) => (
          <li key={checkIn.id}>
            <Link
              to="/$org/members/$memberId"
              params={{ org: organization.slug, memberId: checkIn.member.id }}
              className="checkins-row checkins-grid"
            >
              <time className="checkins-row__time" dateTime={checkIn.checked_in_at} suppressHydrationWarning>
                {clockTime(checkIn.checked_in_at, organization.timezone)}
              </time>
              <span className="checkins-row__member">
                <span className="checkins-row__avatar" aria-hidden="true">
                  {initials(checkIn.member.name).slice(0, 1)}
                </span>
                <span className="checkins-row__name">{checkIn.member.name}</span>
              </span>
              {showLocation ? <span className="checkins-row__location">{locationName(checkIn.location_id)}</span> : null}
              <span className="checkins-row__result" data-result={checkIn.result}>
                {checkIn.result === "granted" ? <GrantedMark /> : <DeniedMark size={14} />}
                {resultText(checkIn)}
              </span>
              <ChevronRight className="checkins-row__chevron" {...icon} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoMatch({ results, q }: { results: CheckInResult[]; q: string }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  return (
    <TableState
      title={noMatchText(results, q)}
      action={
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={() => void navigate({ to: "/$org/check-in", params: { org: organization.slug }, search: {}, replace: true })}
        >
          {q && !results.length ? "Clear search" : "Clear filters"}
        </Button>
      }
    />
  );
}

/** Column titles without Location: the empty list and the failed load. */
function CheckInsHead() {
  return (
    <div className="checkins-table__head checkins-grid" aria-hidden="true">
      <span>Time</span>
      <span>Member</span>
      <span>Result</span>
      <span />
    </div>
  );
}

/** Paper "Did not load": the header band, one line, the reason in staff words, and Try again. */
function DidNotLoad({ error }: { error: Failure }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <>
      <div className="checkins-table">
        <CheckInsHead />
      </div>
      <div className="list-state checkins-state" role="alert">
        <p>Check-ins didn't load</p>
        <p className="checkins-state__text">{failureMessage(error)}</p>
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
      </div>
    </>
  );
}

/** Paper "Loading": the title, the header band, and grey bars where the rows go. */
export function CheckInsLoading() {
  return (
    <div className="page checkins-page" role="status" aria-busy="true" aria-label="Loading check-ins">
      <header className="checkins-head">
        <h1>Check-ins</h1>
      </header>
      <div className="checkins-table">
        <div className="checkins-table__head checkins-grid" aria-hidden="true">
          <span>Time</span>
          <span>Member</span>
          <span>Result</span>
          <span />
        </div>
        <div className="checkins-rows">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="checkins-row checkins-grid checkins-skeleton">
              <span className="skeleton-line" style={{ width: 36 }} />
              <span className="checkins-row__member">
                <span className="checkins-row__avatar skeleton-block" />
                <span className="skeleton-line" style={{ width: 112 }} />
              </span>
              <span className="skeleton-line" style={{ width: 96 }} />
              <span />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

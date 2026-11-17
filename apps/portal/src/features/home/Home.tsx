import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { ArrowRight, CalendarDays, ChevronRight, CircleAlert, House, MoreHorizontal, Package, UserPlus } from "lucide-react";
import { PageActions } from "../../components/PageActions";
import { Kbd } from "../../components/ui";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useCan, useDeskLocation, useOrganization } from "../../lib/organization";
import type { Failure, Result } from "../../lib/result";
import { useShortcut } from "../../lib/shortcuts";
import { useCheckIn } from "../check-ins/CheckInFlow";
import { clockTime } from "../check-ins/facts";
import { FindMemberDialog } from "../check-ins/FindMember";
import { atLocation, programLine, rowStatusText, sessionState } from "../schedule/facts";
import { OccurrenceMark } from "../schedule/marks";
import {
  attentionItems,
  bookingsText,
  checkInsLine,
  checkInsText,
  todayLabel,
  todaysSessions,
  upNext,
  upNextCount,
  type AttentionItem,
} from "./facts";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Entry = Schemas["ScheduleEntry"];
type Overview = Schemas["StaffOverview"];

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

/**
 * Home: today at the desk location. Up next lists the sessions that have not
 * ended, Needs attention lists the Rails counts that ask for work, and the
 * properties hold today's counts. Check in (C) and Sell (S) start in the top bar.
 */
export function Home({ overview, schedule }: { overview: Result<Overview>; schedule: Result<Entry[]> }) {
  const organization = useOrganization();
  const desk = useDeskLocation();
  const can = useCan();
  const now = new Date();
  // A role without programs:read has no sessions to see, so Up next and Bookings stay out.
  const seesSessions = can("programs:read") && !(!schedule.ok && schedule.error.code === "forbidden");
  const today = schedule.ok ? todaysSessions(atLocation(schedule.data, desk?.id ?? null), organization.timezone, now) : [];

  return (
    <div className="page home">
      <div className="home__main">
        <HomeHead overview={overview} />
        {seesSessions ? (
          <section className="home-section" aria-labelledby="home-up-next">
            <SectionBand id="home-up-next" icon={<CalendarDays {...icon} />} title="Up next">
              {schedule.ok && today.length ? <span className="home-band__count">{upNextCount(upNext(today, now).length, today.length)}</span> : null}
            </SectionBand>
            {schedule.ok ? <UpNext today={today} now={now} /> : <DidNotLoad what="Sessions" error={schedule.error} />}
          </section>
        ) : null}
        <section className="home-section" aria-labelledby="home-attention">
          <SectionBand id="home-attention" icon={<CircleAlert {...icon} />} title="Needs attention" />
          {overview.ok ? <NeedsAttention overview={overview.data} /> : <DidNotLoad what="Needs attention" error={overview.error} />}
        </section>
      </div>
      <aside className="home-props" aria-label="Today">
        <section className="home-props__group">
          <h2>Today</h2>
          {overview.ok ? (
            <dl>
              <Property label="Check-ins">{checkInsText(overview.data.check_ins_today)}</Property>
              {seesSessions && schedule.ok ? <Property label="Bookings">{bookingsText(today) ?? "No sessions"}</Property> : null}
            </dl>
          ) : (
            <p className="home-props__failed">
              <CircleAlert {...icon} />
              Counts did not load
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function HomeHead({ overview }: { overview?: Result<Overview> }) {
  const organization = useOrganization();
  const desk = useDeskLocation();
  return (
    <header className="home-head">
      <span className="home-head__tile" aria-hidden="true">
        <House strokeWidth={1.5} />
      </span>
      <div className="home-head__text">
        <h1>Today</h1>
        <p className="home-head__meta" suppressHydrationWarning>
          {todayLabel(organization.timezone)}
          {desk ? ` · ${desk.name}` : null}
        </p>
        {overview?.ok ? <p className="home-head__phone-meta">{checkInsLine(overview.data.check_ins_today)}</p> : null}
      </div>
      <HomeActions />
    </header>
  );
}

/** Check in (C), Sell (S), and ⋯ in the top bar. Each shows only for roles that can use it. */
function HomeActions() {
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  const flow = useCheckIn();
  const [finding, setFinding] = useState(false);
  const canCheckIn = can("check_ins:create");
  const canSell = can("purchases:create");
  const canAddMember = can("members:create");
  const sell = () => void navigate({ to: "/$org/sales/new", params: { org: organization.slug } });
  useShortcut("c", () => setFinding(true), { enabled: canCheckIn });
  useShortcut("s", sell, { enabled: canSell });

  return (
    <>
      <PageActions>
        {canCheckIn ? (
          <Button
            type="button"
            variant="secondary"
            size="compact"
            aria-haspopup="dialog"
            aria-keyshortcuts="C"
            disabled={flow.pending}
            aria-busy={flow.pending || undefined}
            onClick={() => setFinding(true)}
          >
            {flow.pending ? "Checking in…" : "Check in"}
            <Kbd>C</Kbd>
          </Button>
        ) : null}
        {canSell ? (
          <Link
            to="/$org/sales/new"
            params={{ org: organization.slug }}
            className={buttonVariants({ variant: "secondary", size: "compact" })}
            aria-keyshortcuts="S"
          >
            Sell
            <Kbd>S</Kbd>
          </Link>
        ) : null}
        {canAddMember ? (
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions">
              <MoreHorizontal {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void navigate({ to: "/$org/members/new", params: { org: organization.slug } })}>
                <UserPlus {...icon} />
                New member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </PageActions>
      {canCheckIn ? (
        <>
          <FindMemberDialog
            open={finding}
            onOpenChange={setFinding}
            hasLocation={flow.hasLocation}
            onPick={(member) => {
              setFinding(false);
              void flow.checkIn(member);
            }}
          />
          {flow.dialog}
        </>
      ) : null}
    </>
  );
}

function SectionBand({ id, icon: mark, title, children }: { id: string; icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="home-band">
      {mark}
      <h2 id={id} className="home-band__title">
        {title}
      </h2>
      {children}
    </div>
  );
}

function UpNext({ today, now }: { today: Entry[]; now: Date }) {
  const organization = useOrganization();
  const next = upNext(today, now);
  if (!next.length) {
    return (
      <div className="home-empty">
        <p>{today.length ? "No more sessions today." : "No sessions today."}</p>
        <Link to="/$org/schedule" params={{ org: organization.slug }} className="home-link">
          Open schedule
          <ArrowRight {...icon} />
        </Link>
      </div>
    );
  }
  return (
    <>
      <ul className="home-rows">
        {next.map((entry) => (
          <li key={entry.id}>
            <SessionRow entry={entry} now={now} />
          </li>
        ))}
      </ul>
      <div className="home-more">
        <Link to="/$org/schedule" params={{ org: organization.slug }} className="home-link">
          {today.length > next.length ? `View all ${today.length} sessions` : "Open schedule"}
          <ArrowRight {...icon} />
        </Link>
      </div>
    </>
  );
}

function SessionRow({ entry, now }: { entry: Entry; now: Date }) {
  const organization = useOrganization();
  const state = sessionState(entry, now);
  return (
    <Link
      to="/$org/schedule/$occurrenceId"
      params={{ org: organization.slug, occurrenceId: entry.id }}
      className="home-row home-row--session"
      data-past={state === "cancelled" || undefined}
    >
      <time className="home-row__time" dateTime={entry.starts_at} suppressHydrationWarning>
        {clockTime(entry.starts_at, organization.timezone)}
      </time>
      <span className="home-row__text">
        <span className="home-row__title">{entry.program.name}</span>
        <span className="home-row__line">{programLine(entry, PROGRAM_KIND_LABEL[entry.program.kind])}</span>
      </span>
      <span className="home-row__status" suppressHydrationWarning>
        <OccurrenceMark occurrence={entry} now={now} />
        {rowStatusText(entry, now)}
      </span>
      <ChevronRight className="home-row__chevron" {...icon} />
    </Link>
  );
}

function NeedsAttention({ overview }: { overview: Overview }) {
  const items = attentionItems(overview);
  if (!items.length) {
    return (
      <div className="home-empty">
        <p>Nothing needs attention.</p>
      </div>
    );
  }
  return (
    <ul className="home-rows">
      {items.map((item) => (
        <li key={item.kind}>
          <AttentionRow item={item} />
        </li>
      ))}
    </ul>
  );
}

/** Each row opens the sales list with the matching filter, for roles that can read sales. */
function AttentionRow({ item }: { item: AttentionItem }) {
  const organization = useOrganization();
  const can = useCan();
  const content = (
    <>
      <span className="home-row__tile" aria-hidden="true">
        {item.kind === "balance_due" ? <DueMark /> : <Package {...icon} />}
      </span>
      <span className="home-row__text">
        <span className="home-row__title">{item.title}</span>
      </span>
    </>
  );
  if (!can("purchases:read")) return <div className="home-row home-row--attention">{content}</div>;
  return (
    <Link
      to="/$org/sales"
      params={{ org: organization.slug }}
      search={item.kind === "balance_due" ? { payment: "unpaid,partial" } : { payment: "paid", fulfillment: "waiting" }}
      className="home-row home-row--attention"
    >
      {content}
      <ChevronRight className="home-row__chevron" {...icon} />
    </Link>
  );
}

/** Paper's half-filled amber pie for money due. */
function DueMark() {
  return (
    <svg className="home-due-mark" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
      <path d="M12 3a9 9 0 0 1 0 18Z" />
    </svg>
  );
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="home-prop">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Paper "Load error": one row with the reason and Try again. The rest of the page stays. */
function DidNotLoad({ what, error }: { what: string; error: Failure }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="home-failed" role="alert">
      <CircleAlert className="home-failed__icon" {...icon} />
      <span className="home-row__text">
        <span className="home-row__title">{what} did not load</span>
        <span className="home-row__line">{failureMessage(error)}</span>
      </span>
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
  );
}

/** Paper "Home — Loading": the title and bands stay; bars stand in for rows and values. */
export function HomeLoading() {
  const can = useCan();
  return (
    <div className="page home" role="status" aria-busy="true" aria-label="Loading today">
      <div className="home__main">
        <HomeHead />
        {can("programs:read") ? (
          <section className="home-section" aria-hidden="true">
            <SectionBand id="home-up-next-loading" icon={<CalendarDays {...icon} />} title="Up next" />
            <div className="home-rows">
              {[180, 140, 160].map((width, index) => (
                <div key={index} className="home-row home-row--session">
                  <span className="skeleton-line" style={{ width: 40 }} />
                  <span className="home-row__text">
                    <span className="skeleton-line" style={{ width: width - 40 }} />
                    <span className="skeleton-line skeleton-line--small" style={{ width }} />
                  </span>
                  <span className="skeleton-line" style={{ width: 96 }} />
                  <span />
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <section className="home-section" aria-hidden="true">
          <SectionBand id="home-attention-loading" icon={<CircleAlert {...icon} />} title="Needs attention" />
          <div className="home-rows">
            {[170, 190].map((width, index) => (
              <div key={index} className="home-row home-row--attention">
                <span className="home-row__tile home-row__tile--skeleton" />
                <span className="home-row__text">
                  <span className="skeleton-line" style={{ width }} />
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <aside className="home-props" aria-hidden="true">
        <section className="home-props__group">
          <h2>Today</h2>
          <dl>
            {["Check-ins", "Bookings"].map((label) => (
              <Property key={label} label={label}>
                <span className="skeleton-line" style={{ width: 80 }} />
              </Property>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  EyeOff,
  Globe,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  StickyNote,
  Table2,
  User,
} from "lucide-react";
import { PageActions } from "../../components/PageActions";
import { Kbd } from "../../components/ui";
import { PRODUCT_KIND_LABEL, PROGRAM_KIND_LABEL } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookMemberDialog } from "../schedule/BookMember";
import { clockRange, dayKey, rowStatusText, sessionState } from "../schedule/facts";
import { OccurrenceMark } from "../schedule/marks";
import { SESSION_PREVIEW, bookableSessions, lengthText, pricesOnSale, ticketPrices } from "./facts";
import { KIND_ICON, KindTile } from "./kinds";
import { AddSessionsDialog, NewTicketDialog, TicketPriceRow } from "./ProgramDialogs";
import { usePublishProgram } from "./publish";

type Program = Schemas["ProgramDetail"];
type Open = "sessions" | "ticket" | "book" | "sell" | null;

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

/**
 * Paper "Program details": the kind tile and the name, the sessions from
 * today with their status marks, and Details, Tickets, and "Also bookable
 * with" on the right. Add sessions (T), Sell ticket (S), Book member (B), and
 * ⋯ with Publish (⇧P) and Edit program sit in the top bar. Every fact comes
 * from the Rails program.
 */
export function ProgramDetails({ program }: { program: Program }) {
  const organization = useOrganization();
  const can = useCan();
  const publish = usePublishProgram();
  const [open, setOpen] = useState<Open>(null);
  const [publishing, setPublishing] = useState(false);
  const manage = can("programs:manage");
  const sessions = bookableSessions(program.occurrences);
  const onSale = pricesOnSale(program);
  const canBook = sessions.length > 0 && (can("bookings:create") || can("purchases:create"));
  const canSell = sessions.length > 0 && onSale.length > 0 && can("purchases:create");

  async function togglePublished() {
    if (publishing) return;
    setPublishing(true);
    await publish(program.id, !program.published);
    setPublishing(false);
  }

  useShortcut("t", () => setOpen("sessions"), { enabled: manage });
  useShortcut("s", () => setOpen("sell"), { enabled: canSell });
  useShortcut("b", () => setOpen("book"), { enabled: canBook });
  useShortcut("p", () => void togglePublished(), { enabled: manage, shift: true });

  return (
    <div className="page program-page">
      <header className="program-head">
        <KindTile kind={program.kind} size={40} />
        <div className="program-head__text">
          <h1>{program.name}</h1>
        </div>
        <PageActions>
          {manage ? (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              className="program-head__sessions"
              aria-keyshortcuts="T"
              aria-haspopup="dialog"
              onClick={() => setOpen("sessions")}
            >
              Add sessions
              <Kbd>T</Kbd>
            </Button>
          ) : null}
          {canSell ? (
            <Button type="button" variant="secondary" size="compact" aria-keyshortcuts="S" aria-haspopup="dialog" onClick={() => setOpen("sell")}>
              Sell ticket
              <Kbd>S</Kbd>
            </Button>
          ) : null}
          {canBook ? (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              className="program-head__book"
              aria-keyshortcuts="B"
              aria-haspopup="dialog"
              onClick={() => setOpen("book")}
            >
              Book member
              <Kbd>B</Kbd>
            </Button>
          ) : null}
          {manage ? (
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions">
                <MoreHorizontal {...icon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="sale-menu">
                <DropdownMenuItem disabled={publishing} onClick={() => void togglePublished()}>
                  {program.published ? <EyeOff {...icon} /> : <Globe {...icon} />}
                  {program.published ? "Make staff only" : "Publish"}
                  <DropdownMenuShortcut>⇧P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link to="/$org/programs/$programId/edit" params={{ org: organization.slug, programId: program.id }} />}
                >
                  <Pencil {...icon} />
                  Edit program
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </PageActions>
      </header>

      <Properties program={program} manage={manage} onAddTicket={() => setOpen("ticket")} />

      <div className="program-page__sessions">
        <Sessions program={program} onAdd={manage ? () => setOpen("sessions") : undefined} />
      </div>

      {open === "sessions" ? <AddSessionsDialog program={program} onClose={() => setOpen(null)} /> : null}
      {open === "ticket" ? <NewTicketDialog program={program} onClose={() => setOpen(null)} /> : null}
      {open === "book" && canBook ? <BookMemberDialog sessions={sessions} onClose={() => setOpen(null)} /> : null}
      {open === "sell" && canSell ? <BookMemberDialog sessions={sessions} mode="sell" onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

/* ---------- Sessions ---------- */

function Sessions({ program, onAdd }: { program: Program; onAdd?: () => void }) {
  const organization = useOrganization();
  const [expanded, setExpanded] = useState(false);
  const tz = organization.timezone;
  const today = dayKey(new Date().toISOString(), tz);
  const all = program.occurrences;
  const shown = expanded ? all : all.slice(0, SESSION_PREVIEW);
  const hidden = all.length - shown.length;

  return (
    <section className="program-sessions" aria-labelledby="program-sessions-title">
      <div className="mx-section__head">
        <CalendarDays {...icon} />
        <h2 id="program-sessions-title">
          Sessions <span className="mx-section__count">{all.length}</span>
        </h2>
        {onAdd ? (
          <Button type="button" variant="ghost" size="compact" className="program-sessions__add" aria-haspopup="dialog" onClick={onAdd}>
            <Plus {...icon} />
            Add sessions
          </Button>
        ) : null}
      </div>
      {all.length ? (
        <ul className="program-rows">
          {shown.map((occurrence) => {
            const state = sessionState(occurrence);
            const day = dayKey(occurrence.starts_at, tz);
            return (
              <li key={occurrence.id}>
                <Link
                  to="/$org/schedule/$occurrenceId"
                  params={{ org: organization.slug, occurrenceId: occurrence.id }}
                  className="program-row"
                  data-past={state === "ended" || state === "cancelled" || undefined}
                >
                  <span className="program-row__day" suppressHydrationWarning>
                    {sessionDay(occurrence.starts_at, tz)}
                  </span>
                  <span className="program-row__time" suppressHydrationWarning>
                    {clockRange(occurrence.starts_at, occurrence.ends_at, tz)}
                    {day === today ? <span className="program-row__today">Today</span> : null}
                  </span>
                  <span className="program-row__status" data-state={state}>
                    <OccurrenceMark occurrence={occurrence} />
                    <span className="program-row__status-text" suppressHydrationWarning>
                      {rowStatusText(occurrence)}
                    </span>
                  </span>
                  <ChevronRight className="program-row__chevron" {...icon} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mx-empty">No coming sessions</p>
      )}
      {hidden > 0 ? (
        <button type="button" className="mx-more program-sessions__more" aria-expanded={false} onClick={() => setExpanded(true)}>
          Show {hidden} more
          <ChevronDown className="mx-more__icon" {...icon} />
        </button>
      ) : null}
    </section>
  );
}

/** "Thu 5 Nov" in the gym's time zone. */
function sessionDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(",", "");
}

/* ---------- Properties ---------- */

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mx-prop">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Properties({ program, manage, onAddTicket }: { program: Program; manage: boolean; onAddTicket: () => void }) {
  const organization = useOrganization();
  const KindIcon = KIND_ICON[program.kind];
  const prices = ticketPrices(program);
  return (
    <aside className="mx-props program-props" aria-label="Program details">
      <section className="mx-props__group" aria-labelledby="program-props-title">
        <h2 id="program-props-title">Details</h2>
        <dl>
          <Property label="Kind">
            <span className="mx-value">
              <KindIcon {...icon} />
              <span className="mx-value__text">{PROGRAM_KIND_LABEL[program.kind]}</span>
            </span>
          </Property>
          <Property label="Host">
            <span className="mx-value" data-empty={program.host_name ? undefined : true}>
              <User {...icon} />
              <span className="mx-value__text">{program.host_name ?? "No host"}</span>
            </span>
          </Property>
          <Property label="Length">
            <span className="mx-value">
              <Clock {...icon} />
              <span className="mx-value__text money">{lengthText(program.duration_minutes)}</span>
            </span>
          </Property>
          <Property label="Capacity">
            <span className="mx-value">
              <Table2 {...icon} />
              <span className="mx-value__text money">
                {program.capacity} {program.capacity === 1 ? "spot" : "spots"}
              </span>
            </span>
          </Property>
          <Property label="Visibility">
            <span className="mx-value">
              {program.published ? <Globe {...icon} /> : <EyeOff {...icon} />}
              <span className="mx-value__text">{program.published ? "Published" : "Staff only"}</span>
            </span>
          </Property>
          {organization.locations.length > 1 ? (
            <Property label="Location">
              <span className="mx-value">
                <MapPin {...icon} />
                <span className="mx-value__text">{program.location_name}</span>
              </span>
            </Property>
          ) : null}
        </dl>
      </section>

      <section className="mx-props__group" aria-labelledby="program-tickets-title">
        <h2 id="program-tickets-title" className="program-props__head">
          Tickets
          {manage ? (
            <button type="button" className="program-props__add" aria-label="New ticket" aria-haspopup="dialog" onClick={onAddTicket}>
              <Plus {...icon} />
            </button>
          ) : null}
        </h2>
        {prices.length ? (
          <ul className="program-tickets">
            {prices.map((price) => (
              <TicketPriceRow key={price.id} price={price} manage={manage} />
            ))}
          </ul>
        ) : (
          <p className="program-props__empty">No ticket prices</p>
        )}
      </section>

      <section className="mx-props__group" aria-labelledby="program-accepted-title">
        <h2 id="program-accepted-title">Also bookable with</h2>
        {program.accepted_by.length ? (
          <ul className="program-tickets">
            {program.accepted_by.map((offer) => (
              <li key={offer.id} className="program-ticket">
                <span className="program-ticket__name">{offer.name}</span>
                <span className="program-ticket__kind">{PRODUCT_KIND_LABEL[offer.kind]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="program-props__empty">None yet</p>
        )}
      </section>

      {program.description ? (
        <section className="mx-props__group program-props__note" aria-labelledby="program-note-title">
          <h2 id="program-note-title">
            <StickyNote {...icon} />
            Note
          </h2>
          <p>{program.description}</p>
        </section>
      ) : null}
    </aside>
  );
}

/* ---------- Loading and not found ---------- */

/** Paper "Program details — Loading": the tile, title, Sessions band, rows, and Details as grey bars. */
export function ProgramLoading() {
  return (
    <div className="page program-page" role="status" aria-busy="true" aria-label="Loading the program">
      <header className="program-head" aria-hidden="true">
        <span className="program-tile skeleton-block" data-size={40} />
        <div className="program-head__text">
          <span className="skeleton-line" style={{ width: 200, height: 16 }} />
        </div>
      </header>
      <aside className="mx-props program-props" aria-hidden="true">
        <div className="mx-props__group">
          <h2>Details</h2>
          {[56, 48, 60, 52, 64].map((width, index) => (
            <div key={index} className="mx-prop">
              <span className="skeleton-line" style={{ width }} />
              <span className="skeleton-line" style={{ width: 96, marginLeft: 24 }} />
            </div>
          ))}
        </div>
      </aside>
      <div className="program-page__sessions" aria-hidden="true">
        <div className="program-sessions">
          <div className="mx-section__head">
            <span className="skeleton-line" style={{ width: 96 }} />
          </div>
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="program-row program-row--skeleton">
              <span className="skeleton-line" style={{ width: 72 }} />
              <span className="skeleton-line" style={{ width: 96 }} />
              <span className="skeleton-line" style={{ width: 110 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Paper "Not found" and "Did not load": one line and one action. */
export function ProgramDidNotLoad({ notFound, message }: { notFound: boolean; message: string }) {
  const organization = useOrganization();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="page program-page">
      <div className="list-state" role="alert">
        <p className="list-state__title">{notFound ? "This program was not found." : "This program did not load."}</p>
        {notFound ? null : <p className="list-state__text">{message}</p>}
        {notFound ? (
          <Link to="/$org/programs" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            Back to Programs
          </Link>
        ) : (
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
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Tile } from "@/components/parts/marks";
import { Icon } from "@/components/ui/icon";
import { useToast } from "../../components/Toast";
import { SubmitButton, initials } from "../../components/ui";
import { failureMessage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useDeskLocation, useOrganization } from "../../lib/organization";
import type { Failure } from "../../lib/result";
import { createBooking, createSale, getBookingOptions, listMembers } from "../../lib/staff.functions";
import { Command, CommandInputPrimitive, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useMemberSearch } from "./useMemberSearch";
import { SaleDialog } from "../sales/SaleDialogs";
import {
  missingSpot,
  resizeSpots,
  rightDetail,
  saleAttempt,
  sellLabel,
  sessionName,
  spotChoices,
  ticketAttendees,
  ticketPriceText,
  type SaleAttempt,
  type Spot,
} from "./facts";

const sendBooking = (input: Parameters<typeof createBooking>[0]["data"]) => createBooking({ data: input });
const sendSale = (input: Parameters<typeof createSale>[0]["data"]) => createSale({ data: input });
const loadOptions = (input: Parameters<typeof getBookingOptions>[0]["data"]) => getBookingOptions({ data: input });

const icon = { "aria-hidden": true, focusable: false } as const;

type Choice = { kind: "right"; id: string } | { kind: "price"; id: string };

/** What the dialog needs to know about a session. A roster and a program's sessions both have it. */
export type BookingSession = Pick<Schemas["Occurrence"], "id" | "starts_at" | "spots_left">;

/**
 * Paper "Book member": choose the member, then one choice: a pass or
 * membership they hold, or a ticket for this session. A ticket can buy several
 * spots; each other spot is a member or a named guest. After a ticket sale the
 * page stays on the session and the toast opens the sale.
 */
export function BookMemberDialog({
  roster: fixed,
  sessions = [],
  mode = "book",
  onClose,
}: {
  /** The session to book. Omit it and pass `sessions` to choose one in the dialog. */
  roster?: BookingSession;
  /** Sessions to choose from, when the dialog starts from a program. */
  sessions?: BookingSession[];
  /** "sell" opens Paper's Sell ticket: tickets only, no passes. */
  mode?: "book" | "sell";
  onClose: () => void;
}) {
  const organization = useOrganization();
  const desk = useDeskLocation();
  const can = useCan();
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();
  const options = useAction(loadOptions);
  const booking = useAction(sendBooking);
  const sale = useAction(sendSale);
  const canBook = can("bookings:create") && mode === "book";
  const canSell = can("purchases:create");
  const [sessionId, setSessionId] = useState(() => fixed?.id ?? sessions[0]?.id ?? "");
  const roster = fixed ?? sessions.find((session) => session.id === sessionId) ?? sessions[0]!;

  const [member, setMember] = useState<Schemas["Member"] | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [spotError, setSpotError] = useState<string | null>(null);
  // The last unanswered ticket sale, so a retry sends the same key.
  const attempt = useRef<SaleAttempt | null>(null);
  // The search field leaves after a pick. Keep focus in the form, so ⌘↵ and Tab work.
  const changeRef = useRef<HTMLButtonElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);

  const full = roster.spots_left === 0;
  const loaded = options.data;
  const rights = canBook && loaded ? loaded.rights : [];
  const prices = canSell && loaded ? loaded.ticket_prices : [];
  const count = Math.max(spots.length, 1);
  const pending = booking.pending || sale.pending;
  const chosenRight = choice?.kind === "right" ? rights.find((right) => right.id === choice.id) : undefined;
  const chosenPrice = choice?.kind === "price" ? prices.find((price) => price.id === choice.id) : undefined;
  const blocked = full || !!loaded?.booking;

  async function choose(next: Schemas["Member"] | null, occurrenceId: string = roster.id) {
    setMember(next);
    setChoice(null);
    setSpots([]);
    setSpotError(null);
    attempt.current = null;
    booking.reset();
    sale.reset();
    options.reset();
    if (!next) return;
    requestAnimationFrame(() => changeRef.current?.focus());
    const result = await options.run({ slug: organization.slug, id: occurrenceId, memberId: next.id });
    if (!result.ok) return;
    // Start on the first pass, as in Paper; otherwise the first ticket price.
    const firstRight = canBook ? result.data.rights[0] : undefined;
    const firstPrice = canSell ? result.data.ticket_prices[0] : undefined;
    setChoice(firstRight ? { kind: "right", id: firstRight.id } : firstPrice ? { kind: "price", id: firstPrice.id } : null);
    requestAnimationFrame(() => choicesRef.current?.querySelector<HTMLInputElement>("input[name='book-choice']:checked")?.focus());
  }

  function edited() {
    booking.reset();
    sale.reset();
  }

  async function submit() {
    if (!member || pending || blocked) return;
    if (chosenRight) {
      const result = await booking.run({ slug: organization.slug, occurrence_id: roster.id, member_id: member.id, entitlement_id: chosenRight.id });
      if (!result.ok) return;
      onClose();
      toast.show({ tone: "success", title: `${member.name} booked with ${chosenRight.name}` });
      void router.invalidate();
      return;
    }
    if (!chosenPrice || !desk) return;
    const missing = missingSpot(spots);
    if (missing >= 0) {
      setSpotError(`Choose a member or type a guest name for spot ${missing + 1}.`);
      return;
    }
    setSpotError(null);
    const attendees = ticketAttendees(spots);
    const request = {
      member_id: member.id,
      price_id: chosenPrice.id,
      location_id: desk.id,
      occurrence_id: roster.id,
      ...(attendees ? { quantity: attendees.length, attendees } : {}),
    };
    attempt.current = saleAttempt(request, attempt.current);
    const result = await sale.run({ slug: organization.slug, idempotencyKey: attempt.current.key, ...request });
    if (!result.ok) return;
    attempt.current = null;
    onClose();
    const saleId = result.data.id;
    toast.show({
      tone: "success",
      title: "Ticket sale recorded",
      body: `Take payment, then fulfill it to book the ${count > 1 ? "spots" : "spot"}.`,
      action: { label: "Open sale", onClick: () => void navigate({ to: "/$org/sales/$saleId", params: { org: organization.slug, saleId } }) },
    });
    void router.invalidate();
  }

  const label = chosenRight ? `Book with ${chosenRight.name}` : chosenPrice ? sellLabel(chosenPrice, count) : "Book";
  return (
    <SaleDialog
      title={mode === "sell" ? "Sell ticket" : "Book member"}
      wide
      className="book-dialog"
      meta={
        fixed ? (
        <span className="book-dialog__meta" data-full={full || undefined}>
          {full ? <span className="book-dialog__dot" aria-hidden="true" /> : null}
          {sessionName(roster.starts_at, organization.timezone)} ·{" "}
          {full ? "Full" : roster.spots_left === 1 ? "1 spot left" : `${roster.spots_left} spots left`}
        </span>
        ) : undefined
      }
      pending={pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={(shortcut) => (
        <SubmitButton
          compact
          pending={pending}
          pendingLabel={chosenPrice ? "Selling…" : "Booking…"}
          disabled={!member || !choice || blocked || options.pending || (!!chosenPrice && !desk)}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {label}
          {shortcut}
        </SubmitButton>
      )}
    >
      {fixed ? null : (
        <div className="book-dialog__group">
          <label className="book-dialog__label" htmlFor="book-session">
            Session
          </label>
          <NativeSelect
            id="book-session"
            className="sale-input"
            value={roster.id}
            disabled={pending}
            onChange={(event) => {
              setSessionId(event.target.value);
              // The member's passes and an existing booking depend on the session.
              if (member) void choose(member, event.target.value);
            }}
          >
            {sessions.map((session) => (
              <NativeSelectOption key={session.id} value={session.id}>
                {sessionName(session.starts_at, organization.timezone)} · {spotsLeftText(session.spots_left)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="book-dialog__group">
        <span className="book-dialog__label" id="book-member-label">
          Member
        </span>
        {member ? (
          <div className="book-dialog__chosen">
            <Tile size="small">{initials(member.name).slice(0, 2)}</Tile>
            <span className="book-dialog__name">{member.name}</span>
            <span className="book-dialog__email">{member.email}</span>
            <button ref={changeRef} type="button" className="book-dialog__change" disabled={pending} onClick={() => void choose(null)}>
              Change<span className="visually-hidden"> member</span>
            </button>
          </div>
        ) : (
          <MemberSearch onPick={(picked) => void choose(picked)} />
        )}
        {options.error ? (
          <Line tone="critical">Their passes did not load. Choose the member again to retry.</Line>
        ) : loaded?.booking ? (
          <Line tone="info">{`${loaded.member.name} is already booked.`}</Line>
        ) : member && full ? (
          <Line tone="warning">This session is full</Line>
        ) : null}
      </div>

      {member && options.pending ? <OptionsLoading canBook={canBook} /> : null}

      {member && loaded && !loaded.booking ? (
        <div className="book-dialog__options" ref={choicesRef}>
          {canBook ? (
            <fieldset className="book-dialog__group">
              <legend className="book-dialog__label">Book with a pass or membership</legend>
              {rights.length ? (
                <div className="book-choices">
                  {rights.map((right) => (
                    <label key={right.id} className="book-choice" data-disabled={full || undefined}>
                      <span className="book-choice__tile" aria-hidden="true">
                        {right.remaining === null ? <Icon name="payments" {...icon} /> : <Icon name="pass" {...icon} />}
                      </span>
                      <span className="book-choice__text">
                        <span className="book-choice__name">{right.name}</span>
                        <span className="book-choice__detail">{rightDetail(right, organization.timezone)}</span>
                      </span>
                      <input
                        type="radio"
                        name="book-choice"
                        className="book-radio"
                        checked={choice?.kind === "right" && choice.id === right.id}
                        disabled={full || pending}
                        onChange={() => {
                          setChoice({ kind: "right", id: right.id });
                          edited();
                        }}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="book-dialog__note book-dialog__none">{loaded.member.name} has no pass or membership that covers this session.</p>
              )}
            </fieldset>
          ) : null}

          {prices.length ? (
            <fieldset className="book-dialog__group book-dialog__tickets" data-divided={canBook || undefined}>
              <div className="book-dialog__ticket-head">
                <legend className="book-dialog__label">{canBook ? "Or sell a ticket for this session" : "Sell a ticket for this session"}</legend>
                <label className="book-dialog__count-label" htmlFor="book-tickets">
                  Tickets
                </label>
                <NativeSelect
                  id="book-tickets"
                  className="sale-input book-dialog__count"
                  value={String(count)}
                  disabled={full || pending}
                  onChange={(event) => {
                    setSpots((list) => resizeSpots(list, Number(event.target.value), member.id));
                    setSpotError(null);
                    const firstPrice = prices[0];
                    if (choice?.kind !== "price" && firstPrice) setChoice({ kind: "price", id: firstPrice.id });
                    edited();
                  }}
                >
                  {Array.from({ length: spotChoices(roster.spots_left) }, (_, index) => (
                    <NativeSelectOption key={index} value={String(index + 1)}>
                      {index + 1}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              {spots.length > 1 ? (
                <WhoIsComing
                  buyer={member}
                  spots={spots}
                  error={spotError}
                  disabled={pending}
                  onChange={(index, next) => {
                    setSpots((list) => list.map((item, at) => (at === index ? next : item)));
                    setSpotError(null);
                    edited();
                  }}
                />
              ) : null}
              <div className="book-choices">
                {prices.map((price) => (
                  <label key={price.id} className="book-choice book-choice--price" data-disabled={full || undefined}>
                    <span className="book-choice__name">{price.label}</span>
                    <span className="book-choice__price">{ticketPriceText(price, count)}</span>
                    <input
                      type="radio"
                      name="book-choice"
                      className="book-radio"
                      checked={choice?.kind === "price" && choice.id === price.id}
                      disabled={full || pending}
                      onChange={() => {
                        setChoice({ kind: "price", id: price.id });
                        edited();
                      }}
                    />
                  </label>
                ))}
              </div>
              <p className="book-dialog__note">
                {count > 1
                  ? "A ticket opens a new sale. The spots are booked when the sale is fulfilled."
                  : "A ticket opens a new sale. The spot is booked when the sale is fulfilled."}
              </p>
              {!desk ? <Line tone="warning">Add a location before selling tickets.</Line> : null}
            </fieldset>
          ) : null}

          {booking.error ? <Failed title="Not booked." error={booking.error} /> : null}
          {sale.error ? <Failed title="The ticket sale was not recorded." error={sale.error} /> : null}
        </div>
      ) : null}
    </SaleDialog>
  );
}

function spotsLeftText(left: number): string {
  if (left === 0) return "Full";
  return left === 1 ? "1 spot left" : `${left} spots left`;
}

/** Step 1: Rails searches name and email as staff type. */
function MemberSearch({ onPick }: { onPick: (member: Schemas["Member"]) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const search = useMemberSearch(q, true);
  const members = search.state === "done" ? search.members : [];
  return (
    <Command filter={false} query={query} onQueryChange={setQuery} className="book-search">
      <div className="book-search__field">
        <Icon name="search" className="book-search__icon" {...icon} />
        <CommandInputPrimitive
          className="book-search__input"
          placeholder="Search by name or email"
          aria-labelledby="book-member-label"
          autoFocus
        />
      </div>
      {/* The listbox stays in the page so the input's aria-controls always points at it. */}
      <div className="book-search__list" hidden={search.state === "idle"}>
        <CommandList className="command__items">
          {members.map((member) => (
            <CommandItem key={member.id} value={member.id} className="book-search__item" onSelect={() => onPick(member)}>
              <Tile size="small">{initials(member.name).slice(0, 2)}</Tile>
              <span className="book-dialog__name">{member.name}</span>
              <span className="book-dialog__email">{member.email}</span>
            </CommandItem>
          ))}
        </CommandList>
          {search.state === "loading" ? (
            <p className="book-search__status" role="status">
              Searching members…
            </p>
          ) : search.state === "failed" ? (
            <p className="book-search__status" role="alert">
              Search didn't load. Check the connection, then try again.
            </p>
          ) : search.state === "done" && !members.length ? (
            <p className="book-search__status" role="status">
              No members match “{search.q}”
            </p>
          ) : null}
      </div>
    </Command>
  );
}

/** Each spot after the first: a member of this gym or a guest by name. */
function WhoIsComing({
  buyer,
  spots,
  error,
  disabled,
  onChange,
}: {
  buyer: Schemas["Member"];
  spots: Spot[];
  error: string | null;
  disabled: boolean;
  onChange: (index: number, spot: Spot) => void;
}) {
  const others = useOtherMembers(buyer.id);
  const missing = missingSpot(spots);
  return (
    <div className="book-spots">
      <p className="book-dialog__note">Who is coming</p>
      <ol className="book-spots__list">
        {spots.map((spot, index) => {
          const id = `book-spot-${index}`;
          const invalid = error !== null && index === missing;
          return (
            <li key={index} className="book-spot">
              <label className="book-spot__label" htmlFor={`${id}-who`}>
                Spot {index + 1}
              </label>
              <NativeSelect
                id={`${id}-who`}
                className="sale-input book-spot__who"
                value={spot.kind === "guest" ? "guest" : spot.memberId}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    index,
                    event.target.value === "guest" ? { ...spot, kind: "guest", memberId: "" } : { ...spot, kind: "member", memberId: event.target.value },
                  )
                }
              >
                <NativeSelectOption value={buyer.id}>{buyer.name}</NativeSelectOption>
                <NativeSelectOption value="guest">Guest</NativeSelectOption>
                {others.map((member) => (
                  <NativeSelectOption key={member.id} value={member.id}>
                    {member.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {spot.kind === "guest" ? (
                <>
                  <Input
                    id={`${id}-name`}
                    className="sale-input book-spot__input"
                    aria-label={`Spot ${index + 1}: guest name`}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? "book-spots-error" : undefined}
                    placeholder="Guest name"
                    maxLength={200}
                    value={spot.name}
                    disabled={disabled}
                    onChange={(event) => onChange(index, { ...spot, name: event.target.value })}
                  />
                  <Input
                    id={`${id}-email`}
                    className="sale-input book-spot__input"
                    aria-label={`Spot ${index + 1}: guest email, optional`}
                    placeholder="Email (optional)"
                    type="email"
                    maxLength={320}
                    value={spot.email}
                    disabled={disabled}
                    onChange={(event) => onChange(index, { ...spot, email: event.target.value })}
                  />
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
      {error ? (
        <p id="book-spots-error" className="book-dialog__line book-spots__error" data-tone="critical" role="alert">
          <Icon name="notifications" {...icon} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The gym's other members, for spots taken by a member. Loads once, when a group sale starts. */
function useOtherMembers(buyerId: string): Schemas["Member"][] {
  const organization = useOrganization();
  const [members, setMembers] = useState<Schemas["Member"][]>([]);
  useEffect(() => {
    let current = true;
    listMembers({ data: { slug: organization.slug } })
      .then((result) => {
        if (current && result.ok) setMembers(result.data);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [organization.slug]);
  return members.filter((member) => member.id !== buyerId);
}

/** A plain 12px line with a small mark, as in the Paper dialog states. */
function Line({ tone, children }: { tone: "critical" | "warning" | "info"; children: string }) {
  return (
    <p className="book-dialog__line" data-tone={tone} role={tone === "critical" ? "alert" : "status"}>
      {tone === "critical" ? <Icon name="notifications" {...icon} /> : <span className="book-dialog__dot" aria-hidden="true" />}
      {children}
    </p>
  );
}

function Failed({ title, error }: { title: string; error: Failure }) {
  return (
    <p className="book-dialog__line" data-tone="critical" role="alert">
      <Icon name="notifications" {...icon} />
      {title} {failureMessage(error)}
    </p>
  );
}

function OptionsLoading({ canBook }: { canBook: boolean }) {
  return (
    <div className="book-dialog__group" role="status" aria-label="Loading their passes">
      {canBook ? <span className="book-dialog__label">Book with a pass or membership</span> : null}
      {[0, 1].map((index) => (
        <div key={index} className="book-choice book-choice--skeleton" aria-hidden="true">
          <span className="book-choice__tile skeleton-block" />
          <span className="book-choice__text">
            <span className="skeleton-line" style={{ width: 104 }} />
            <span className="skeleton-line" style={{ width: 66 }} />
          </span>
        </div>
      ))}
    </div>
  );
}

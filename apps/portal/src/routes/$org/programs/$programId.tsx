import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { CalendarPlus, EyeOff, Globe, Pencil, Plus, Ticket } from "lucide-react";
import { PriceActions } from "../../../components/PriceActions";
import { ProgramDialog, ScheduleDialog, TicketDialog } from "../../../components/ProgramDialogs";
import { Empty, FailureNotice, PageHead, Pill, Plate, SkeletonRows, Status } from "../../../components/ui";
import { PRODUCT_KIND_LABEL, PROGRAM_KIND_LABEL, formatDate, formatMoney, formatTime } from "../../../lib/format";
import { useCan, useOrganization } from "../../../lib/organization";
import { getProgram } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/$org/programs/$programId")({
  loader: ({ params }) => {
    if (!isUuid(params.programId)) {
      return Promise.resolve({ ok: false as const, error: { status: 404, code: "not_found" as const, message: "Program not found" } });
    }
    return getProgram({ data: { slug: params.org, id: params.programId } });
  },
  pendingComponent: () => <SkeletonRows rows={8} />,
  component: ProgramPage,
});

type Open = "edit" | "schedule" | "ticket" | null;

function ProgramPage() {
  const program = Route.useLoaderData();
  const organization = useOrganization();
  const can = useCan();
  const [open, setOpen] = useState<Open>(null);

  if (!program.ok) {
    return (
      <div className="page program-page">
        <FailureNotice error={program.error} title="This program did not load" />
      </div>
    );
  }

  const data = program.data;
  const manage = can("programs:manage");
  return (
    <div className="page program-page">
      <PageHead
        title={data.name}
        description={[
          PROGRAM_KIND_LABEL[data.kind],
          data.location_name,
          `${data.duration_minutes} min`,
          `${data.capacity} ${data.capacity === 1 ? "spot" : "spots"} per time`,
          data.host_name,
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        {data.published ? (
          <Pill tone="good" icon={Globe}>
            On the gym site
          </Pill>
        ) : (
          <Pill tone="neutral" icon={EyeOff}>
            Staff only
          </Pill>
        )}
        {manage ? (
          <Button type="button" variant="secondary" onClick={() => setOpen("edit")}>
            <Pencil aria-hidden="true" />
            Edit
          </Button>
        ) : null}
      </PageHead>
      {data.description ? <p className="program-page__description">{data.description}</p> : null}

      <div className="program-page__layout">
        <Times program={data} onAdd={manage ? () => setOpen("schedule") : undefined} />
        <div className="stack">
          <Tickets program={data} onAdd={manage ? () => setOpen("ticket") : undefined} />
          <Plate title="Also books it" description="Passes and memberships whose rights cover this program.">
            {data.accepted_by.length ? (
              <ul className="rights">
                {data.accepted_by.map((offer) => (
                  <li key={offer.id} className="right">
                    <span className="cell-title">{offer.name}</span>
                    <span className="cell-sub">{PRODUCT_KIND_LABEL[offer.kind]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                None yet. In <Link to="/$org/products" params={{ org: organization.slug }}>Plans &amp; offers</Link>, add a
                program benefit to a pass or membership.
              </p>
            )}
          </Plate>
        </div>
      </div>

      {open === "edit" ? <ProgramDialog program={data} onClose={() => setOpen(null)} /> : null}
      {open === "schedule" ? <ScheduleDialog program={data} onClose={() => setOpen(null)} /> : null}
      {open === "ticket" ? <TicketDialog program={data} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function spotsState(occurrence: Schemas["Occurrence"]): { state: "off" | "due" | "active" | "waiting"; label: string } {
  if (occurrence.cancelled_at) return { state: "off", label: "Cancelled" };
  if (occurrence.spots_left === 0) return { state: "due", label: "Full" };
  return { state: "active", label: `${occurrence.spots_left} left` };
}

function Times({ program, onAdd }: { program: Schemas["ProgramDetail"]; onAdd?: () => void }) {
  const organization = useOrganization();
  return (
    <Plate
      title="Times"
      description="From today. Open a time to see who is booked."
      flush
      action={
        onAdd ? (
          <Button type="button" size="sm" onClick={onAdd}>
            <CalendarPlus aria-hidden="true" />
            Add times
          </Button>
        ) : undefined
      }
    >
      {program.occurrences.length === 0 ? (
        <Empty title="No coming times">
          <p>{onAdd ? "Select Add times to put this program on the schedule." : "A manager must add times first."}</p>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">When</TableHead>
              <TableHead scope="col" className="num">
                Booked
              </TableHead>
              <TableHead scope="col">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {program.occurrences.map((occurrence) => {
              const spots = spotsState(occurrence);
              return (
                <TableRow key={occurrence.id}>
                  <TableCell>
                    <Link
                      to="/$org/schedule/$occurrenceId"
                      params={{ org: organization.slug, occurrenceId: occurrence.id }}
                      className="cell-title"
                    >
                      {formatDate(occurrence.starts_at, organization.timezone)}
                    </Link>
                    <span className="cell-sub">
                      {formatTime(occurrence.starts_at, organization.timezone)} to {formatTime(occurrence.ends_at, organization.timezone)}
                    </span>
                  </TableCell>
                  <TableCell className="num">
                    {occurrence.spots_taken} / {occurrence.capacity}
                  </TableCell>
                  <TableCell>
                    <Status state={spots.state}>{spots.label}</Status>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Plate>
  );
}

function Tickets({ program, onAdd }: { program: Schemas["ProgramDetail"]; onAdd?: () => void }) {
  const prices = program.ticket?.prices ?? [];
  return (
    <Plate
      title="Tickets"
      description="A ticket buys one spot at one time."
      icon={<Ticket />}
      action={
        onAdd ? (
          <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
            <Plus aria-hidden="true" />
            Add price
          </Button>
        ) : undefined
      }
    >
      {prices.length === 0 ? (
        <p className="muted">No ticket prices. Members can book only with a pass or membership.</p>
      ) : (
        <ul className="rights">
          {prices.map((price) => (
            <li key={price.id} className="right ticket-price">
              <span>
                <span className="cell-title">{price.label}</span>
                <span className="cell-sub">
                  {formatMoney(price.amount_minor, price.currency)} ·{" "}
                  {price.archived_at ? "Archived" : price.available ? "On sale" : "Not on sale"}
                </span>
              </span>
              {onAdd && !price.archived_at ? <PriceActions price={price} /> : null}
            </li>
          ))}
        </ul>
      )}
    </Plate>
  );
}

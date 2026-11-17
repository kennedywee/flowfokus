import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Plus } from "lucide-react";
import { ProgramDialog } from "../../../components/ProgramDialogs";
import { Empty, FailureNotice, PageHead, Pill, Plate, SkeletonRows } from "../../../components/ui";
import { PROGRAM_KIND_LABEL } from "../../../lib/format";
import { useCan, useLocationName, useOrganization } from "../../../lib/organization";
import { listPrograms } from "../../../lib/staff.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/$org/programs/")({
  loader: ({ params }) => listPrograms({ data: { slug: params.org } }),
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: Programs,
});

function Programs() {
  const programs = Route.useLoaderData();
  const organization = useOrganization();
  const locationName = useLocationName();
  const can = useCan();
  const [adding, setAdding] = useState(false);

  return (
    <div className="page programs-page">
      <PageHead
        title="Programs"
        actions={
          <>
            <Link
              to="/$org/schedule"
              params={{ org: organization.slug }}
              className={buttonVariants({ variant: "secondary", size: "compact" })}
            >
              <CalendarDays aria-hidden="true" />
              Schedule
            </Link>
            {can("programs:manage") ? (
              <Button type="button" size="compact" onClick={() => setAdding(true)}>
                <Plus aria-hidden="true" />
                New program
              </Button>
            ) : null}
          </>
        }
      />
      {!programs.ok ? (
        <FailureNotice error={programs.error} title="Programs did not load" />
      ) : programs.data.length === 0 ? (
        <Empty title="No programs yet" icon={CalendarDays}>
          <p>
            {can("programs:manage")
              ? "Select New program to create a class, an event, or appointment slots."
              : "Programs appear here once a manager adds them."}
          </p>
        </Empty>
      ) : (
        <Plate title="All programs" flush>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Program</TableHead>
                <TableHead scope="col" className="col-wide">
                  Location
                </TableHead>
                <TableHead scope="col" className="num">
                  Spots
                </TableHead>
                <TableHead scope="col" className="num">
                  Coming sessions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.data.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <Link
                      to="/$org/programs/$programId"
                      params={{ org: organization.slug, programId: program.id }}
                      className="cell-title"
                    >
                      {program.name}
                    </Link>
                    <span className="cell-sub">
                      {PROGRAM_KIND_LABEL[program.kind]}
                      {program.host_name ? ` · ${program.host_name}` : ""} · {program.duration_minutes} min
                      <span className="phone-only"> · {locationName(program.location_id)}</span>
                    </span>
                    {program.published ? null : (
                      <Pill tone="neutral">Staff only</Pill>
                    )}
                  </TableCell>
                  <TableCell className="col-wide">{locationName(program.location_id)}</TableCell>
                  <TableCell className="num">{program.capacity}</TableCell>
                  <TableCell className="num">{program.upcoming_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Plate>
      )}
      {adding ? <ProgramDialog onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

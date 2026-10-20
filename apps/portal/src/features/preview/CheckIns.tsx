import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Download, LogIn } from "lucide-react";
import { CheckInPanel } from "../../components/CheckInPanel";
import { Avatar, Empty, FailureNotice, Plate, Status, buttonClass } from "../../components/ui";
import { useLocationName, useOrganization } from "../../lib/organization";
import { DENIAL, formatWhen } from "../../lib/format";
import { downloadCsv } from "./export";
import { Filters, PreviewPage } from "./shared";

const route = getRouteApi("/$org/check-in");
export function CheckIns() {
  const { members, visits } = route.useLoaderData();
  const organization = useOrganization();
  const locationName = useLocationName();
  const [filter, setFilter] = useState("All visits");
  const records = visits.ok ? visits.data : [];
  const visible = records.filter(
    (visit) => filter === "All visits" || visit.result === (filter === "Granted" ? "granted" : "denied"),
  );
  return (
    <PreviewPage
      sample={false}
      title="Check-in"
      description="A clear answer for the person in front of you."
      actions={
        <button
          type="button"
          className={buttonClass({ variant: "secondary", size: "small" })}
          onClick={() =>
            downloadCsv("check-ins.csv", [
              ["Member", "Location", "Time", "Result"],
              ...visible.map((visit) => [
                visit.member.name,
                locationName(visit.location_id),
                visit.checked_in_at,
                visit.result,
              ]),
            ])
          }
        >
          <Download aria-hidden="true" />
          Export visits
        </button>
      }
    >
      <div className="preview-checkin-layout">
        <Plate title="Front desk" description="Choose a member and location to record a visit." icon={<LogIn />}>
          {members.ok ? <CheckInPanel members={members.data} /> : <FailureNotice error={members.error} />}

        </Plate>
        <Plate
          title="Recent visits"
          description={`${records.filter((visit) => visit.result === "granted").length} granted · ${records.filter((visit) => visit.result === "denied").length} denied`}
          flush
        >
          <div className="preview-table-toolbar">
            <Filters
              values={["All visits", "Granted", "Denied"]}
              value={filter}
              onChange={setFilter}
              label="Filter visits"
            />
          </div>
          {visits.ok ? (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Location</th>
                      <th scope="col">Time</th>
                      <th scope="col">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((visit) => (
                      <tr key={visit.id}>
                        <td>
                          <div className="preview-person">
                            <Avatar name={visit.member.name} size={28} />
                            <div>
                              <strong>{visit.member.name}</strong>
                              <p>{visit.denial_reason ? DENIAL[visit.denial_reason].title : "Membership access"}</p>
                            </div>
                          </div>
                        </td>
                        <td>{locationName(visit.location_id)}</td>
                        <td className="preview-mono">
                          <time dateTime={visit.checked_in_at} suppressHydrationWarning>
                            {formatWhen(visit.checked_in_at, organization.timezone)}
                          </time>
                        </td>
                        <td>
                          <Status state={visit.result}>{visit.result === "granted" ? "Granted" : "Denied"}</Status>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visible.length ? (
                <Empty title="No visits in this view">
                  <p>Try a different filter.</p>
                </Empty>
              ) : null}
            </>
          ) : (
            <FailureNotice error={visits.error} />
          )}
        </Plate>
      </div>
    </PreviewPage>
  );
}

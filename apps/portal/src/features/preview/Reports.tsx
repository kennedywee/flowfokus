import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Download } from "lucide-react";
import { FailureNotice, Money, Plate } from "../../components/ui";
import { PAYMENT_METHOD_LABEL, formatDate } from "../../lib/format";
import type { Result } from "../../lib/result";
import { useOrganization } from "../../lib/organization";
import { downloadCsv } from "./export";
import { Filters, PreviewPage } from "./shared";
import { Button } from "@/components/ui/button";

export const REPORT_PERIODS = { "This week": 1, "Last 2 weeks": 2, "Last 4 weeks": 4, "Last 12 weeks": 12 } as const;
export type ReportPeriod = keyof typeof REPORT_PERIODS;
type Metric = "Sales" | "Payments" | "Check-ins";

function weekLabel(startsOn: string): string {
  return new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${startsOn}T00:00:00Z`));
}

function share(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Weekly figures from Rails, in the organization time zone. */
export function Reports({ report, period }: { report: Result<Schemas["Report"]>; period: ReportPeriod }) {
  const organization = useOrganization();
  const navigate = useNavigate({ from: "/$org/reports" });
  const [metric, setMetric] = useState<Metric>("Sales");

  if (!report.ok) {
    return (
      <PreviewPage title="Reports" description="What came in, and who came through." sample={false}>
        <FailureNotice error={report.error} title="The report did not load" />
      </PreviewPage>
    );
  }

  const { weeks, currency, by_location: byLocation, by_method: byMethod } = report.data;
  const sales = weeks.reduce((total, week) => total + week.sales_minor, 0);
  const payments = weeks.reduce((total, week) => total + week.payments_minor, 0);
  const refunds = weeks.reduce((total, week) => total + week.refunds_minor, 0);
  const granted = weeks.reduce((total, week) => total + week.check_ins_granted, 0);
  const denied = weeks.reduce((total, week) => total + week.check_ins_denied, 0);
  const value = (week: Schemas["ReportWeek"]) =>
    metric === "Sales" ? week.sales_minor : metric === "Payments" ? week.payments_minor : week.check_ins_granted + week.check_ins_denied;
  const show = (week: Schemas["ReportWeek"]) =>
    metric === "Check-ins" ? String(value(week)) : new Intl.NumberFormat("en-MY", { style: "currency", currency }).format(value(week) / 100);
  const max = Math.max(1, ...weeks.map(value));
  const methodTotal = byMethod.reduce((total, row) => total + row.payments_minor, 0);

  return (
    <PreviewPage
      title="Reports"
      description="What came in, and who came through. Void sales are left out."
      sample={false}
      actions={
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            downloadCsv(`${organization.slug}-weekly-report.csv`, [
              ["Week starting", "Sales", `Sales (${currency})`, `Payments (${currency})`, `Refunds (${currency})`, "Check-ins granted", "Check-ins denied", "New members"],
              ...weeks.map((week) => [
                week.starts_on,
                week.sale_count,
                (week.sales_minor / 100).toFixed(2),
                (week.payments_minor / 100).toFixed(2),
                (week.refunds_minor / 100).toFixed(2),
                week.check_ins_granted,
                week.check_ins_denied,
                week.new_members,
              ]),
            ])
          }
        >
          <Download aria-hidden="true" />
          Export report
        </Button>
      }
    >
      <div className="stack">
        <div className="preview-report-toolbar">
          <Filters
            values={Object.keys(REPORT_PERIODS) as ReportPeriod[]}
            value={period}
            onChange={(next) => void navigate({ search: next === "Last 4 weeks" ? {} : { period: next }, replace: true })}
            label="Report period"
          />
          <span className="muted">
            {formatDate(report.data.from, organization.timezone)} to {formatDate(report.data.through, organization.timezone)} · All locations
          </span>
        </div>
        <dl className="preview-summary">
          <div>
            <dt>Membership sales</dt>
            <dd>
              <Money minor={sales} currency={currency} />
            </dd>
            <span>{weeks.reduce((total, week) => total + week.sale_count, 0)} sales recorded</span>
          </div>
          <div>
            <dt>Money received</dt>
            <dd>
              <Money minor={payments - refunds} currency={currency} />
            </dd>
            <span>
              Payments <Money minor={payments} currency={currency} />, refunds <Money minor={refunds} currency={currency} />
            </span>
          </div>
          <div>
            <dt>Check-ins</dt>
            <dd>{granted + denied}</dd>
            <span>
              {granted} granted · {denied} denied
            </span>
          </div>
        </dl>
        <Plate
          title="Week by week"
          description="Weeks start on Monday. The last week is still running."
          action={<Filters values={["Sales", "Payments", "Check-ins"] as Metric[]} value={metric} onChange={setMetric} label="Chart metric" />}
        >
          <div className="preview-chart" role="img" aria-label={`${metric} by week: ${weeks.map((week) => `${weekLabel(week.starts_on)}: ${show(week)}`).join(", ")}`}>
            {weeks.map((week) => (
              <div className="preview-chart__column" key={week.starts_on}>
                <span>{show(week)}</span>
                <div className="preview-chart__track">
                  <div className="preview-chart__bar" style={{ height: `${(value(week) / max) * 100}%` }} />
                </div>
                <span>{weekLabel(week.starts_on)}</span>
              </div>
            ))}
          </div>
        </Plate>
        <div className="grid-2">
          <Plate title="Sales by location" description="Where each sale was recorded.">
            <div className="preview-breakdown">
              {byLocation.map((row) => (
                <div key={row.location_id}>
                  <div>
                    <strong>{row.name}</strong>
                    <Money minor={row.sales_minor} currency={currency} />
                  </div>
                  <meter min={0} max={100} value={share(row.sales_minor, sales)} aria-label={`${row.name} share of sales`} />
                  <span>{share(row.sales_minor, sales)}% of sales</span>
                </div>
              ))}
            </div>
          </Plate>
          <Plate title="Payment methods" description="Payments recorded at the desk.">
            <div className="preview-breakdown">
              {byMethod.map((row) => (
                <div key={row.method}>
                  <div>
                    <strong>{PAYMENT_METHOD_LABEL[row.method]}</strong>
                    <Money minor={row.payments_minor} currency={currency} />
                  </div>
                  <meter min={0} max={100} value={share(row.payments_minor, methodTotal)} aria-label={`${PAYMENT_METHOD_LABEL[row.method]} share of payments`} />
                  <span>{share(row.payments_minor, methodTotal)}% of payments</span>
                </div>
              ))}
            </div>
          </Plate>
        </div>
      </div>
    </PreviewPage>
  );
}

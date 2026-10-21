import { useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import { Money, Plate } from "../../components/ui";
import { reportWeeks } from "./data";
import { downloadCsv } from "./export";
import { Filters, PreviewPage } from "./shared";
import { Button } from "@/components/ui/button";

export function Reports() {
  const [period, setPeriod] = useState("Last 4 weeks");
  const [metric, setMetric] = useState("Sales");
  const weeks =
    period === "This week" ? reportWeeks.slice(-1) : period === "Last 2 weeks" ? reportWeeks.slice(-2) : reportWeeks;
  const sales = weeks.reduce((total, week) => total + week.sales, 0);
  const visits = weeks.reduce((total, week) => total + week.visits, 0);
  const max = Math.max(...weeks.map((week) => (metric === "Sales" ? week.sales : week.visits)));
  return (
    <PreviewPage
      title="Reports"
      description="A view of what came in, and who came through."
      actions={
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() =>
            downloadCsv("sample-weekly-report.csv", [
              ["Week", "Sales (MYR)", "Visits"],
              ...weeks.map((week) => [week.label, (week.sales / 100).toFixed(2), week.visits]),
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
            values={["This week", "Last 2 weeks", "Last 4 weeks"]}
            value={period}
            onChange={setPeriod}
            label="Report period"
          />
          <span className="muted">Through 21 Oct 2026 · All locations</span>
        </div>
        <dl className="preview-summary">
          <div>
            <dt>Membership sales</dt>
            <dd>
              <Money minor={sales} currency="MYR" />
            </dd>
            <span>Recorded sample sales</span>
          </div>
          <div>
            <dt>Check-ins</dt>
            <dd>{visits}</dd>
            <span>Across both locations</span>
          </div>
          <div>
            <dt>Average per week</dt>
            <dd>
              <Money minor={Math.round(sales / weeks.length)} currency="MYR" />
            </dd>
            <span>
              {weeks.length} {weeks.length === 1 ? "week" : "weeks"} in this view
            </span>
          </div>
        </dl>
        <Plate
          title="Week by week"
          description="Compare sales and visits over the selected period."
          action={<Filters values={["Sales", "Visits"]} value={metric} onChange={setMetric} label="Chart metric" />}
        >
          <div
            className="preview-chart"
            role="img"
            aria-label={`${metric} by week: ${weeks.map((week) => `${week.label}: ${metric === "Sales" ? `RM ${week.sales / 100}` : `${week.visits} visits`}`).join(", ")}`}
          >
            {weeks.map((week) => (
              <div className="preview-chart__column" key={week.label}>
                <span>{metric === "Sales" ? `RM ${(week.sales / 100).toLocaleString("en-MY")}` : week.visits}</span>
                <div className="preview-chart__track">
                  <div
                    className="preview-chart__bar"
                    style={{ height: `${((metric === "Sales" ? week.sales : week.visits) / max) * 100}%` }}
                  />
                </div>
                <span>{week.label}</span>
              </div>
            ))}
          </div>
        </Plate>
        <div className="grid-2">
          <Plate title="By location" description="Share of the selected sample sales.">
            <div className="preview-breakdown">
              {[
                { name: "Bangsar", share: 60 },
                { name: "Mont Kiara", share: 40 },
              ].map((row) => (
                <div key={row.name}>
                  <div>
                    <strong>{row.name}</strong>
                    <Money minor={Math.round((sales * row.share) / 100)} currency="MYR" />
                  </div>
                  <meter min={0} max={100} value={row.share} aria-label={`${row.name} share of sales`} />
                  <span>{row.share}% of sales</span>
                </div>
              ))}
            </div>
          </Plate>
          <Plate title="Payment methods" description="Manual payments in the sample period.">
            <div className="preview-breakdown">
              {[
                { name: "Bank transfer", share: 70 },
                { name: "Cash", share: 30 },
              ].map((row) => (
                <div key={row.name}>
                  <div>
                    <strong>{row.name}</strong>
                    <Money minor={Math.round((sales * row.share) / 100)} currency="MYR" />
                  </div>
                  <meter min={0} max={100} value={row.share} aria-label={`${row.name} share of payments`} />
                  <span>{row.share}% of payments</span>
                </div>
              ))}
            </div>
          </Plate>
        </div>
        <div className="preview-report-note">
          <ArrowUpRight aria-hidden="true" />
          <p>Figures are sample data for exploring the report. Export downloads the values in this view.</p>
        </div>
      </div>
    </PreviewPage>
  );
}

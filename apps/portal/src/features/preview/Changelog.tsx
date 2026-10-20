import { Check, Sparkles } from "lucide-react";
import { Pill } from "../../components/ui";
import { PreviewPage } from "./shared";

const updates = [
  {
    version: "Preview",
    date: "21 October 2026",
    title: "More of your desk, in one place",
    description:
      "Explore the next set of Flowfokus screens with sample data. Try the interactions before the live records are connected.",
    items: [
      "Inbox updates with read and resolve actions",
      "A desk assistant conversation with prepared replies",
      "A dedicated check-in screen and visit history",
      "Weekly reports with CSV export",
      "Organization, team, and branch settings",
    ],
  },
  {
    version: "v0.4",
    date: "21 October 2026",
    title: "A calmer staff portal",
    description: "A dark workspace, clearer navigation, and less work between you and the next member.",
    items: [
      "A collapsible sidebar with quick, subtle motion",
      "Page headers and content aligned in one centered column",
      "Member creation opens from the page header",
      "Layouts that adapt to phones, tablets, and desk screens",
    ],
  },
];
export function Changelog() {
  return (
    <PreviewPage title="What’s new" description="Small improvements for the work you do every day.">
      <div className="preview-changelog">
        {updates.map((update) => (
          <article className="preview-release" key={update.version}>
            <div className="preview-release__date">
              <Pill tone={update.version === "Preview" ? "info" : "neutral"}>{update.version}</Pill>
              <span>{update.date}</span>
            </div>
            <div className="preview-release__body">
              <Sparkles aria-hidden="true" />
              <h2>{update.title}</h2>
              <p>{update.description}</p>
              <ul>
                {update.items.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </PreviewPage>
  );
}

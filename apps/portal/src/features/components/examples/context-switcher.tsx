import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ContextSwitcher } from "../../../components/ContextSwitcher";

/** The organization and location crumbs of the top bar. Each opens a searchable list. */
export default function Example() {
  const [location, setLocation] = useState("bangsar");
  const names: Record<string, string> = { bangsar: "Bangsar", "mont-kiara": "Mont Kiara" };
  return (
    <div className="gallery-switchers">
      <ContextSwitcher
        label="Organization"
        strong
        icon={<span className="org-tile">C</span>}
        current="Chainsaw Gym"
        options={[{ value: "chainsaw", label: "Chainsaw Gym", aside: "Owner" }]}
        value="chainsaw"
        onSelect={() => {}}
        searchLabel="Switch organization…"
        emptyText="No organization matches."
      />
      <span className="topbar__slash" aria-hidden="true">/</span>
      <ContextSwitcher
        label="Location"
        icon={<Icon name="location" aria-hidden="true" focusable="false" />}
        current={names[location]!}
        options={Object.entries(names).map(([value, label]) => ({
          value,
          label,
          icon: <Icon name="location" aria-hidden="true" focusable="false" />,
        }))}
        value={location}
        onSelect={setLocation}
        searchLabel="Switch location…"
        emptyText="No location matches."
      />
    </div>
  );
}

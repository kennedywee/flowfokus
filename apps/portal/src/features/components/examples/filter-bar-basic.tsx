import { useState } from "react";
import { FilterBar, type FilterField } from "@/components/parts/FilterBar";
import { SearchField } from "@/components/ListToolbar";
import type { ActiveFilter } from "@/lib/list-parts";

const FIELDS: FilterField[] = [
  {
    key: "status",
    label: "Status",
    icon: "paid",
    options: [
      { value: "active", label: "Active", count: 140 },
      { value: "frozen", label: "Frozen", count: 9 },
      { value: "ended", label: "Ended", count: 37 },
    ],
  },
  {
    key: "tag",
    label: "Tag",
    icon: "products",
    options: [
      { value: "staff", label: "Staff", dot: "neutral", count: 6 },
      { value: "pt", label: "PT client", dot: "good", count: 18 },
      { value: "injury", label: "Injury", dot: "critical", count: 4 },
    ],
  },
];

export default function Example() {
  const [filters, setFilters] = useState<ActiveFilter[]>([
    { field: "status", values: ["active"] },
    { field: "tag", values: ["staff"], negated: true },
  ]);
  const [q, setQ] = useState("");
  return (
    <div className="gallery-fill">
      <FilterBar
        fields={FIELDS}
        filters={filters}
        onChange={setFilters}
        search={<SearchField id="example-filter-search" label="Search members" placeholder="Search members" q={q} onSearch={setQ} />}
      />
    </div>
  );
}

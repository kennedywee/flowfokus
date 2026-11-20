import { useState } from "react";
import { FilterChips, FilterMenu, ListToolbar, SearchField, type FilterGroup } from "@/components/ListToolbar";

type Key = "payment";

export default function Example() {
  const [chosen, setChosen] = useState<string[]>(["unpaid"]);
  const [q, setQ] = useState("");
  const groups: FilterGroup<Key>[] = [
    {
      key: "payment",
      title: "Payment",
      chosen,
      options: [
        { value: "paid", label: "Paid", count: 182 },
        { value: "part_paid", label: "Part paid", count: 9 },
        { value: "unpaid", label: "Unpaid", count: 21 },
      ],
    },
  ];
  return (
    <div className="gallery-fill">
      <ListToolbar
        filter={<FilterMenu groups={groups} onChange={(_, values) => setChosen(values)} />}
        chips={<FilterChips groups={groups} onClear={() => setChosen([])} />}
        search={<SearchField id="example-search" label="Search sales" placeholder="Search" q={q} onSearch={setQ} />}
      />
    </div>
  );
}

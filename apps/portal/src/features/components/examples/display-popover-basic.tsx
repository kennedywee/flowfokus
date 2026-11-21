import { useState } from "react";
import { DisplayPopover, type DisplayColumn } from "@/components/parts/FilterBar";
import type { SortState } from "@/lib/list-parts";

const DEFAULT_SORT: SortState = { column: "name", direction: "asc" };
const DEFAULT_COLUMNS: DisplayColumn[] = [
  { id: "id", label: "ID", on: true },
  { id: "phone", label: "Phone", on: true },
  { id: "tags", label: "Tags", on: true },
  { id: "since", label: "Member since", on: true },
  { id: "spent", label: "Spent", on: true },
  { id: "email", label: "Email", on: false },
];

export default function Example() {
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [ended, setEnded] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const isDefault =
    sort.column === DEFAULT_SORT.column &&
    sort.direction === DEFAULT_SORT.direction &&
    !ended &&
    columns.every((column, index) => column.on === DEFAULT_COLUMNS[index]!.on);
  return (
    <DisplayPopover
      sortFields={[
        { value: "name", label: "Name" },
        { value: "since", label: "Member since" },
        { value: "spent", label: "Spent" },
      ]}
      sort={sort}
      onSort={setSort}
      toggle={{ label: "Show ended members", checked: ended, onChange: setEnded }}
      columns={columns}
      onColumn={(id, on) => setColumns((current) => current.map((column) => (column.id === id ? { ...column, on } : column)))}
      isDefault={isDefault}
      onReset={() => {
        setSort(DEFAULT_SORT);
        setEnded(false);
        setColumns(DEFAULT_COLUMNS);
      }}
    />
  );
}

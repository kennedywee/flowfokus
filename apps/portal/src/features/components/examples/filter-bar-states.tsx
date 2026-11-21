import { FilterBar, FilterBarChip, type FilterField } from "@/components/parts/FilterBar";
import { SearchField } from "@/components/ListToolbar";
import { DisplayPopover } from "@/components/parts/FilterBar";

const STATUS: FilterField = {
  key: "status",
  label: "Status",
  icon: "paid",
  options: [
    { value: "active", label: "Active" },
    { value: "frozen", label: "Frozen" },
  ],
};

export default function Example() {
  return (
    <div className="gallery-stack">
      <p className="gallery-caption">No filters: the Filter button, then search</p>
      <FilterBar
        fields={[STATUS]}
        filters={[]}
        onChange={() => {}}
        search={<SearchField id="example-states-search" label="Search members" placeholder="Search members" q="" onSearch={() => {}} />}
      />
      <p className="gallery-caption">No fields (the live Members list: Rails has no member filters yet): no Filter button, search and Display only</p>
      <FilterBar
        fields={[]}
        filters={[]}
        onChange={() => {}}
        search={<SearchField id="example-states-search-only" label="Search members" placeholder="Search name or email" q="" onSearch={() => {}} />}
        display={
          <DisplayPopover
            sortFields={[
              { value: "name", label: "Name" },
              { value: "since", label: "Member since" },
            ]}
            sort={{ column: "since", direction: "desc" }}
            onSort={() => {}}
            columns={[
              { id: "since", label: "Member since", on: true },
              { id: "email", label: "Email", on: true },
            ]}
            onColumn={() => {}}
            isDefault
            onReset={() => {}}
          />
        }
      />
      <p className="gallery-caption">Chip: default, hover, focus. One value reads "is"; several read "is any of".</p>
      <div className="gallery-row">
        <FilterBarChip field={STATUS} filter={{ field: "status", values: ["active"] }} onChange={() => {}} />
        <FilterBarChip field={STATUS} filter={{ field: "status", values: ["active"], negated: true }} onChange={() => {}} demo="hover" />
        <FilterBarChip field={STATUS} filter={{ field: "status", values: ["active", "frozen"] }} onChange={() => {}} demo="focus" />
        <FilterBarChip field={STATUS} filter={{ field: "status", values: ["active", "frozen"], negated: true }} onChange={() => {}} />
      </div>
    </div>
  );
}

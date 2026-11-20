import { useState } from "react";
import { ListPager } from "@/components/ListPager";

export default function Example() {
  const [page, setPage] = useState(1);
  const first = (page - 1) * 50 + 1;
  return (
    <div className="gallery-fill">
      <ListPager label="Sales pages" range={`${first}–${Math.min(page * 50, 212)} of 212 sales`} page={page} pages={5} onPage={setPage} />
    </div>
  );
}

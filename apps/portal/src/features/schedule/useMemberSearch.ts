import { useEffect, useState } from "react";
import type { Schemas } from "@flowfokus/api";
import { useOrganization } from "../../lib/organization";
import { listMembers } from "../../lib/staff.functions";

export type MemberSearch =
  | { state: "idle" }
  | { state: "loading"; q: string }
  | { state: "done"; q: string; members: Schemas["Member"][] }
  | { state: "failed"; q: string };

const RESULTS = 8;

/** Rails searches name and email as staff type. A later search wins. */
export function useMemberSearch(q: string, enabled: boolean): MemberSearch {
  const organization = useOrganization();
  const [search, setSearch] = useState<MemberSearch>({ state: "idle" });
  useEffect(() => {
    if (!enabled || !q) {
      setSearch({ state: "idle" });
      return;
    }
    let current = true;
    setSearch({ state: "loading", q });
    const timer = window.setTimeout(async () => {
      try {
        const result = await listMembers({ data: { slug: organization.slug, q } });
        if (current) setSearch(result.ok ? { state: "done", q, members: result.data.slice(0, RESULTS) } : { state: "failed", q });
      } catch {
        if (current) setSearch({ state: "failed", q });
      }
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [enabled, q, organization.slug]);
  return search;
}

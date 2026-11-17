import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { User, type LucideIcon } from "lucide-react";
import type { Schemas } from "@flowfokus/api";
import { failureMessage } from "../lib/format";
import { listMembers } from "../lib/staff.functions";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface CommandPage {
  label: string;
  icon: LucideIcon;
  open: () => void;
}

type MemberSearch =
  | { state: "idle" }
  | { state: "loading"; q: string }
  | { state: "done"; q: string; members: Schemas["Member"][] }
  | { state: "failed"; q: string; message: string };

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

/**
 * Search, opened with ⌘K or the top bar button. It finds members by name or
 * email through the same Rails search as the members page, and opens pages.
 * Rails decides which members the staff member can see.
 */
export function CommandMenu({
  slug,
  open,
  onOpenChange,
  pages,
  canSearchMembers,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: CommandPage[];
  canSearchMembers: boolean;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<MemberSearch>({ state: "idle" });
  const q = query.trim();

  // Each new search starts after a short pause in typing. A later search wins.
  useEffect(() => {
    if (!open || !canSearchMembers || q.length < 2) {
      setSearch({ state: "idle" });
      return;
    }
    let current = true;
    setSearch({ state: "loading", q });
    const timer = window.setTimeout(async () => {
      try {
        const result = await listMembers({ data: { slug, q } });
        if (!current) return;
        setSearch(
          result.ok
            ? { state: "done", q, members: result.data.slice(0, 8) }
            : { state: "failed", q, message: failureMessage(result.error) },
        );
      } catch {
        if (current) setSearch({ state: "failed", q, message: "The search did not run. Try again." });
      }
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [open, canSearchMembers, q, slug]);

  function close() {
    onOpenChange(false);
    setQuery("");
  }

  const lower = q.toLowerCase();
  const shownPages = pages.filter((page) => page.label.toLowerCase().includes(lower));
  const members = search.state === "done" ? search.members : [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
      title="Search"
      description="Find a member or open a page."
    >
      {/* Rails filters members, and the pages are filtered here, so cmdk shows items as they are. */}
      <Command shouldFilter={false} label="Search">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={canSearchMembers ? "Search members and pages…" : "Search pages…"}
        aria-label="Search"
      />
      <CommandList>
        {members.length ? (
          <CommandGroup heading="Members">
            {members.map((member) => (
              <CommandItem
                key={member.id}
                value={`member-${member.id}`}
                onSelect={() => {
                  close();
                  void navigate({ to: "/$org/members/$memberId", params: { org: slug, memberId: member.id } });
                }}
              >
                <User {...icon} />
                <span className="command__label">{member.name}</span>
                <span className="command__detail">{member.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {shownPages.length ? (
          <CommandGroup heading="Pages">
            {shownPages.map((page) => (
              <CommandItem
                key={page.label}
                value={`page-${page.label}`}
                onSelect={() => {
                  close();
                  page.open();
                }}
              >
                <page.icon {...icon} />
                <span className="command__label">{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <p className="command__status" role="status">
          {search.state === "loading"
            ? "Searching members…"
            : search.state === "failed"
              ? search.message
              : !members.length && !shownPages.length
                ? `Nothing matches “${q}”.`
                : ""}
        </p>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}

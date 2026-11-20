import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { AlertTriangle, CircleAlert, Plus, Search } from "lucide-react";
import { Kbd, initials } from "../../components/ui";
import { useCan, useOrganization } from "../../lib/organization";
import { listMembers } from "../../lib/staff.functions";
import { buttonVariants } from "@/components/ui/button";
import { Command, CommandInputPrimitive, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type MemberSearch =
  | { state: "idle" }
  | { state: "loading"; q: string }
  | { state: "done"; q: string; members: Schemas["Member"][] }
  | { state: "failed"; q: string };

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;
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

/**
 * Paper "Find member": a search field, then the members Rails finds. Choosing
 * a member checks them in at once. Staff search by name or email; Rails has
 * no member numbers or phones yet.
 */
function FindMemberSearch({
  onPick,
  hasLocation,
  inline = false,
}: {
  onPick: (member: Schemas["Member"]) => void;
  hasLocation: boolean;
  inline?: boolean;
}) {
  const organization = useOrganization();
  const can = useCan();
  const [query, setQuery] = useState("");
  const q = query.trim();
  const search = useMemberSearch(q, hasLocation);
  const members = search.state === "done" ? search.members : [];

  const pick = (member: Schemas["Member"]) => {
    setQuery("");
    onPick(member);
  };

  return (
    <Command
      filter={false}
      query={query}
      onQueryChange={setQuery}
      className={inline ? "find-member find-member--inline" : "find-member"}
    >
      <div className="find-member__search">
        <Search className="find-member__icon" {...icon} />
        <CommandInputPrimitive
          className="find-member__input"
          placeholder="Find member by name or email"
          aria-label="Find member by name or email"
          autoFocus={!inline}
        />
        {inline ? null : <Kbd>Esc</Kbd>}
      </div>
      {!hasLocation ? (
        <div className="find-member__state" role="status">
          <p className="find-member__state-title">
            <AlertTriangle className="find-member__warning" {...icon} />
            {organization.name} has no location
          </p>
          <p className="find-member__state-text">Add a location to check members in.</p>
          {can("settings:manage") ? (
            <Link
              to="/$org/settings/locations"
              params={{ org: organization.slug }}
              className={buttonVariants({ variant: "secondary", size: "compact" })}
            >
              Add location
            </Link>
          ) : null}
        </div>
      ) : null}
      {/* The listbox stays in the page so the input's aria-controls always points at it. */}
      <div className="find-member__list" hidden={!hasLocation || search.state === "idle"}>
        <CommandList className="command__items">
          {members.map((member) => (
            <CommandItem key={member.id} value={member.id} className="find-member__item" onSelect={() => pick(member)}>
              <span className="find-member__avatar" aria-hidden="true">
                {initials(member.name)}
              </span>
              <span className="find-member__text">
                <span className="find-member__name">{member.name}</span>
                <span className="find-member__detail">{member.email}</span>
              </span>
              {inline ? (
                <span className="find-member__action" aria-hidden="true">
                  Check in
                </span>
              ) : (
                <span className="find-member__enter" aria-hidden="true">
                  ↵
                </span>
              )}
            </CommandItem>
          ))}
        </CommandList>
          {search.state === "loading" ? (
            <p className="find-member__status" role="status">
              Searching members…
            </p>
          ) : search.state === "failed" ? (
            <div className="find-member__state" role="alert">
              <p className="find-member__state-title">
                <CircleAlert className="find-member__error" {...icon} />
                Search didn't load
              </p>
              <p className="find-member__state-text">Check the connection, then try again.</p>
            </div>
          ) : search.state === "done" && !members.length ? (
            <div className="find-member__state" role="status">
              <p className="find-member__state-title">No members match “{search.q}”</p>
              {can("members:create") ? (
                <Link to="/$org/members/new" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
                  <Plus {...icon} />
                  New member
                </Link>
              ) : null}
            </div>
          ) : null}
      </div>
    </Command>
  );
}

/** The desktop and tablet search, over the page. */
export function FindMemberDialog({
  open,
  onOpenChange,
  onPick,
  hasLocation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (member: Schemas["Member"]) => void;
  hasLocation: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="command-dialog find-member-dialog">
        <DialogTitle className="visually-hidden">Check in</DialogTitle>
        <DialogDescription className="visually-hidden">Find the member. Choosing a member checks them in.</DialogDescription>
        <FindMemberSearch
          hasLocation={hasLocation}
          onPick={(member) => {
            onOpenChange(false);
            onPick(member);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/** The phone search, in the page above today's check-ins, as in Paper "Phone — Check in". */
export function FindMemberInline({ onPick, hasLocation }: { onPick: (member: Schemas["Member"]) => void; hasLocation: boolean }) {
  return <FindMemberSearch inline hasLocation={hasLocation} onPick={onPick} />;
}

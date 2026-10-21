import { useRef, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { ChevronLeft, ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { useToast } from "../../../components/Toast";
import {
  Avatar,
  Empty,
  FailureNotice,
  Field,
  Notice,
  PageHead,
  Plate,
  SkeletonRows,
  SubmitButton,
  describedBy,
} from "../../../components/ui";
import { formatDate } from "../../../lib/format";
import { useAction } from "../../../lib/hooks";
import { useOrganization } from "../../../lib/organization";
import { createMember, listMembers } from "../../../lib/staff.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";

interface MembersSearch {
  q?: string;
}

const sendMember = (input: Parameters<typeof createMember>[0]["data"]) => createMember({ data: input });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Route = createFileRoute("/$org/members/")({
  validateSearch: (search: Record<string, unknown>): MembersSearch => {
    const q = typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
    return q ? { q } : {};
  },
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ params, deps }) => listMembers({ data: { slug: params.org, ...(deps.q ? { q: deps.q } : {}) } }),
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: Members,
});

const PAGE_SIZE = 25;

function focusField(id: string) {
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: "center" });
  field?.focus();
}

function Members() {
  const members = Route.useLoaderData();
  const { q } = Route.useSearch();
  const organization = useOrganization();
  const [adding, setAdding] = useState(false);

  return (
    <div className="page members-page">
      <PageHead title="Members" description="Find a member, or add a new one before their first sale.">
        <Button type="button" onClick={() => setAdding(true)}>
          <UserPlus aria-hidden="true" />
          Add member
        </Button>
      </PageHead>
      <Plate title={q ? `Results for “${q}”` : "All members"} icon={<Users />} flush>
        <div className="members-toolbar toolbar">
          <p className="members-count" aria-live="polite">
            {members.ok ? `${members.data.length} ${members.data.length === 1 ? "member" : "members"}` : null}
          </p>
          <div className="toolbar__spacer" />
          <SearchForm initial={q ?? ""} />
        </div>
        {members.ok ? (
          members.data.length ? (
            <MemberTable key={q ?? ""} members={members.data} />
          ) : (
            <div className="members-state">
              {q ? (
                <Empty title={`No member matches “${q}”`}>
                  <p>Check the spelling, search by email, or add them as a new member.</p>
                  <Link to="/$org/members" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Clear search
                  </Link>
                </Empty>
              ) : (
                <Empty title="No members yet">
                  <p>Select Add member to add the first member. You can then sell them a membership.</p>
                </Empty>
              )}
            </div>
          )
        ) : (
          <div className="members-state">
            <FailureNotice error={members.error} title="Members did not load" />
          </div>
        )}
      </Plate>
      {adding ? <AddMember onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

/** Page numbers to show: first, last, and the current page with its neighbours. */
function pageItems(page: number, pages: number): (number | "gap")[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous > 1) items.push("gap");
    items.push(n);
  });
  return items;
}

function MemberTable({ members }: { members: Schemas["Member"][] }) {
  const organization = useOrganization();
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const first = (page - 1) * PAGE_SIZE;
  const rows = members.slice(first, first + PAGE_SIZE);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col">Email</TableHead>
            <TableHead scope="col">Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <span className="members-name">
                  <Avatar name={member.name} />
                  <Link
                    to="/$org/members/$memberId"
                    params={{ org: organization.slug, memberId: member.id }}
                    className="cell-title"
                  >
                    {member.name}
                  </Link>
                </span>
              </TableCell>
              <TableCell className="muted members-email">{member.email}</TableCell>
              <TableCell className="members-added">
                <time dateTime={member.created_at} suppressHydrationWarning>
                  {formatDate(member.created_at, organization.timezone)}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pages > 1 ? (
        <nav className="pager" aria-label="Members pages">
          <p className="pager__range" aria-live="polite">
            {first + 1}–{first + rows.length} of {members.length} members
          </p>
          <ul className="pager__list">
            <li>
              <button
                type="button"
                className="pager__button"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft aria-hidden="true" strokeWidth={1.75} />
              </button>
            </li>
            {pageItems(page, pages).map((item, index) => (
              <li key={item === "gap" ? `gap-${index}` : item}>
                {item === "gap" ? (
                  <span className="pager__gap" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    className="pager__button"
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                )}
              </li>
            ))}
            <li>
              <button
                type="button"
                className="pager__button"
                aria-label="Next page"
                disabled={page === pages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight aria-hidden="true" strokeWidth={1.75} />
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </>
  );
}

function SearchForm({ initial }: { initial: string }) {
  const navigate = useNavigate({ from: Route.fullPath });
  const [value, setValue] = useState(initial);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    void navigate({ search: q ? { q } : {} });
  }

  return (
    <form role="search" className="members-search" onSubmit={onSubmit}>
      <label htmlFor="member-search" className="visually-hidden">
        Search members by name or email
      </label>
      <div className="search-field">
        <Search aria-hidden="true" strokeWidth={1.75} />
        <Input
          id="member-search" className="input--small"
          type="search"
          placeholder="Search members"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <Button variant="secondary" size="sm" type="submit">
        Search
      </Button>
    </form>
  );
}

function AddMember({ onClose }: { onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendMember);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [local, setLocal] = useState<{ name?: string; email?: string }>({});

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const nameError = local.name ?? server?.name?.join(" ");
  const emailError = local.email ?? server?.email?.join(" ");
  const fieldErrors = [
    nameError ? { id: "member-name", label: "Full name" } : null,
    emailError ? { id: "member-email", label: "Email" } : null,
  ].filter((item) => item !== null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: { name?: string; email?: string } = {};
    if (!name.trim()) errors.name = "Enter the member's full name.";
    if (!EMAIL.test(email.trim())) errors.email = "Enter an email address, for example name@example.com.";
    setLocal(errors);
    if (errors.name || errors.email) {
      focusField(errors.name ? "member-name" : "member-email");
      return;
    }

    const result = await action.run({ slug: organization.slug, name: name.trim(), email: email.trim() });
    if (result.ok) {
      setName("");
      setEmail("");
      toast.show({ tone: "success", title: "Member added", body: `${result.data.name} can now buy a membership.` });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.pending) onClose();
      }}
    >
      <DialogContent className="members-dialog">
        <DialogBody>
          <DialogTitle>Add member</DialogTitle>
          <form className="form" onSubmit={onSubmit} noValidate>
            {fieldErrors.length ? (
              <Notice tone="error" title="The member was not added" live>
                <p>Fix {fieldErrors.length === 1 ? "this field" : "these fields"}, then select Add member.</p>
                <ul className="members-errors">
                  {fieldErrors.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          focusField(item.id);
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : null}
            <div className="members-add">
              <Field id="member-name" label="Full name" error={nameError}>
                <Input
                  id="member-name"
                  autoFocus
                  name="name"
                  autoComplete="off"
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={describedBy("member-name", undefined, nameError)}
                />
              </Field>
              <Field id="member-email" label="Email" error={emailError}>
                <Input
                  id="member-email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  maxLength={320}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={describedBy("member-email", undefined, emailError)}
                />
              </Field>
              <div className="members-add__submit">
                <Button variant="ghost" type="button" disabled={action.pending} onClick={onClose}>
                  Cancel
                </Button>
                <SubmitButton pending={action.pending} pendingLabel="Adding…">
                  <UserPlus aria-hidden="true" />
                  Add member
                </SubmitButton>
              </div>
            </div>
            {action.error && !fieldErrors.length ? (
              <FailureNotice error={action.error} title="The member was not added" />
            ) : null}
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

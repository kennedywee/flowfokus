import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
import { Empty, FailureNotice, Field, Notice, PageHead, Plate, SkeletonRows, SubmitButton, Time, describedBy } from "../../../components/ui";
import { useAction } from "../../../lib/hooks";
import { useOrganization } from "../../../lib/organization";
import { createMember, listMembers } from "../../../lib/staff.functions";

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

function Members() {
  const members = Route.useLoaderData();
  const { q } = Route.useSearch();
  const organization = useOrganization();

  return (
    <div className="page">
      <PageHead title="Members" description="Find a member, or add a new one before their first sale." />
      <div className="grid-2 grid-2--wide-first">
        <Plate title={q ? `Results for “${q}”` : "All members"}>
          <SearchForm initial={q ?? ""} />
          {members.ok ? (
            members.data.length ? (
              <div className="table-wrap">
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.data.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <Link
                            to="/$org/members/$memberId"
                            params={{ org: organization.slug, memberId: member.id }}
                            className="cell-title"
                          >
                            {member.name}
                          </Link>
                        </td>
                        <td className="muted">{member.email}</td>
                        <td className="muted">
                          <Time iso={member.created_at} timeZone={organization.timezone} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : q ? (
              <Empty title="No member matches">
                <p>Check the spelling, search by email, or add them as a new member.</p>
              </Empty>
            ) : (
              <Empty title="No members yet">
                <p>Add the first member with the form. You can then sell them a membership.</p>
              </Empty>
            )
          ) : (
            <FailureNotice error={members.error} title="Members did not load" />
          )}
        </Plate>
        <AddMember />
      </div>
    </div>
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
    <form role="search" className="search-row" onSubmit={onSubmit}>
      <label htmlFor="member-search" className="visually-hidden">
        Search members by name or email
      </label>
      <input
        id="member-search"
        className="input"
        type="search"
        placeholder="Name or email"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="button button--quiet">
        <Search aria-hidden="true" />
        Search
      </button>
    </form>
  );
}

function AddMember() {
  const organization = useOrganization();
  const router = useRouter();
  const action = useAction(sendMember);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [local, setLocal] = useState<{ name?: string; email?: string }>({});

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const nameError = local.name ?? server?.name?.join(" ");
  const emailError = local.email ?? server?.email?.join(" ");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: { name?: string; email?: string } = {};
    if (!name.trim()) errors.name = "Enter the member's full name.";
    if (!EMAIL.test(email.trim())) errors.email = "Enter an email address, for example name@example.com.";
    setLocal(errors);
    if (errors.name || errors.email) return;

    const result = await action.run({ slug: organization.slug, name: name.trim(), email: email.trim() });
    if (result.ok) {
      setName("");
      setEmail("");
      void router.invalidate();
    }
  }

  const created = action.data;
  return (
    <Plate title="Add a member">
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field id="member-name" label="Full name" error={nameError}>
          <input
            id="member-name"
            className="input"
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
          <input
            id="member-email"
            className="input"
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
        <div className="actions">
          <SubmitButton pending={action.pending} pendingLabel="Adding…">
            <UserPlus aria-hidden="true" />
            Add member
          </SubmitButton>
        </div>
        {action.error && action.error.code !== "validation_failed" ? (
          <FailureNotice error={action.error} title="The member was not added" />
        ) : null}
        {action.error?.code === "validation_failed" && !server?.name && !server?.email ? (
          <FailureNotice error={action.error} title="The member was not added" />
        ) : null}
        {created ? (
          <Notice tone="success" title={`${created.name} was added`} live>
            <p>
              <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: created.id }}>
                Open their record
              </Link>{" "}
              or{" "}
              <Link to="/$org/sales/new" params={{ org: organization.slug }} search={{ member: created.id }}>
                sell a membership
              </Link>
              .
            </p>
          </Notice>
        ) : null}
      </form>
    </Plate>
  );
}

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { FailureNotice, Field, Kbd, Notice, describedBy } from "../../components/ui";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { useModKeyLabel, useShortcut } from "../../lib/shortcuts";
import { createMember } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkNewMember, fieldMessage, type NewMemberErrors } from "./list";

const sendMember = (input: Parameters<typeof createMember>[0]["data"]) => createMember({ data: input });
const icon = { "aria-hidden": true, focusable: false } as const;
const FORM_ID = "new-member";

function focusField(id: string) {
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: "center" });
  field?.focus();
}

/**
 * The new member page. Rails stores a name and an email. Create member
 * (⌘↵) saves and opens the member. Leaving with typed details asks first.
 */
export function NewMember() {
  const can = useCan();
  if (!can("members:create")) {
    return (
      <div className="page new-member">
        <NewMemberHead />
        <Notice tone="warning" title="You cannot add members">
          <p>Adding members needs the members:create permission. Ask an owner to change your role.</p>
        </Notice>
      </div>
    );
  }
  return <NewMemberForm />;
}

function NewMemberHead({ children }: { children?: ReactNode }) {
  return (
    <header className="new-member__head">
      <span className="new-member__icon" aria-hidden="true">
        <Icon name="profile" {...icon} />
      </span>
      <h1>New member</h1>
      {children ? <PageActions>{children}</PageActions> : null}
    </header>
  );
}

function NewMemberForm() {
  const organization = useOrganization();
  const navigate = useNavigate();
  const toast = useToast();
  const modKey = useModKeyLabel();
  const action = useAction(sendMember);
  const form = useRef<HTMLFormElement>(null);
  const saved = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [local, setLocal] = useState<NewMemberErrors>({});

  const dirty = name.trim() !== "" || email.trim() !== "";
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  });

  useShortcut("Enter", () => form.current?.requestSubmit(), {
    mod: true,
    enabled: !action.pending && blocker.status !== "blocked",
  });

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const nameError = local.name ?? fieldMessage("Name", server?.name);
  const emailError = local.email ?? fieldMessage("Email", server?.email);
  const fieldErrors = [
    nameError ? { id: "member-name", label: "Full name" } : null,
    emailError ? { id: "member-email", label: "Email" } : null,
  ].filter((item) => item !== null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action.pending) return;
    const errors = checkNewMember(name, email);
    setLocal(errors);
    if (errors.name || errors.email) {
      focusField(errors.name ? "member-name" : "member-email");
      return;
    }

    const result = await action.run({ slug: organization.slug, name: name.trim(), email: email.trim() });
    if (result.ok) {
      saved.current = true;
      toast.show({ tone: "success", title: "Member created", body: result.data.name });
      // Replace this form in history, so Back returns to the list.
      void navigate({
        to: "/$org/members/$memberId",
        params: { org: organization.slug, memberId: result.data.id },
        replace: true,
      });
    } else if (result.error.code === "validation_failed") {
      focusField(result.error.details?.name ? "member-name" : "member-email");
    }
  }

  return (
    <div className="page new-member">
      <NewMemberHead>
        <Button
          type="submit"
          form={FORM_ID}
          size="compact"
          disabled={action.pending}
          aria-busy={action.pending || undefined}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {action.pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Creating…
            </>
          ) : (
            <>
              Create member
              <Kbd>{modKey}↵</Kbd>
            </>
          )}
        </Button>
      </NewMemberHead>

      <form id={FORM_ID} ref={form} className="new-member__form" onSubmit={onSubmit} noValidate>
        {fieldErrors.length ? (
          <Notice tone="error" title="The member was not created" live>
            <p>Fix {fieldErrors.length === 1 ? "this field" : "these fields"}, then select Create member.</p>
            <ul className="new-member__errors">
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
        {action.error && !fieldErrors.length ? (
          <FailureNotice error={action.error} title="The member was not created" />
        ) : null}

        <section className="mx-section" aria-labelledby="profile-title">
          <div className="mx-section__head">
            <Icon name="profile" {...icon} />
            <h2 id="profile-title">Profile</h2>
          </div>
          <div className="new-member__fields">
            <Field id="member-name" label="Full name" error={nameError}>
              <Input
                id="member-name"
                className="input--compact"
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
                className="input--compact"
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
          </div>
        </section>
      </form>

      <ConfirmDialog
        open={blocker.status === "blocked"}
        tone="critical"
        title="Discard this member?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>The details you entered{name.trim() ? ` for ${name.trim()}` : ""} will be lost.</p>
      </ConfirmDialog>
    </div>
  );
}

import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { FormNotice } from "../../components/FormNotice";
import { useToast } from "../../components/Toast";
import { Field, SubmitButton, describedBy } from "../../components/ui";
import { useAction } from "../../lib/hooks";
import { useOrganization } from "../../lib/organization";
import { updateMember } from "../../lib/staff.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SaleDialog } from "../sales/SaleDialogs";
import {
  MEMBER_FIELDS,
  MEMBER_FIELD_LABEL,
  checkMember,
  fieldMessage,
  memberFields,
  todayIn,
  type MemberErrors,
  type MemberField,
  type MemberFields,
} from "./list";

const sendMember = (input: Parameters<typeof updateMember>[0]["data"]) => updateMember({ data: input });
const inputId = (field: MemberField) => `edit-member-${field}`;

/**
 * Changes what Rails stores about a member: name, email, phone, date of
 * birth, emergency contact, and the staff note. It opens on the field staff
 * clicked. Rails checks every value and that the email is free.
 */
export function EditMemberDialog({
  member,
  focus = "name",
  onClose,
}: {
  member: Schemas["MemberDetail"];
  /** The field that gets the focus when the dialog opens. */
  focus?: MemberField;
  onClose: () => void;
}) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendMember);
  const [fields, setFields] = useState<MemberFields>(() => memberFields(member));
  const [local, setLocal] = useState<MemberErrors>({});
  const today = todayIn(organization.timezone);
  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const error = (field: MemberField) => local[field] ?? fieldMessage(MEMBER_FIELD_LABEL[field], server?.[field]);

  const set = (field: MemberField, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setLocal((current) => ({ ...current, [field]: undefined }));
  };

  /** The props every text control shares: its value, state, and error link. */
  const control = (field: MemberField) => ({
    id: inputId(field),
    name: field,
    value: fields[field],
    autoFocus: focus === field,
    autoComplete: "off",
    disabled: action.pending,
    "aria-invalid": error(field) ? (true as const) : undefined,
    "aria-describedby": describedBy(inputId(field), undefined, error(field)),
  });

  async function submit() {
    const errors = checkMember(fields, today);
    setLocal(errors);
    const first = MEMBER_FIELDS.find((field) => errors[field]);
    if (first) {
      document.getElementById(inputId(first))?.focus();
      return;
    }
    const result = await action.run({
      slug: organization.slug,
      id: member.id,
      name: fields.name.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim() || null,
      date_of_birth: fields.date_of_birth || null,
      emergency_contact_name: fields.emergency_contact_name.trim() || null,
      emergency_contact_phone: fields.emergency_contact_phone.trim() || null,
      note: fields.note.trim() || null,
    });
    if (result.ok) {
      toast.show({ tone: "success", title: "Member saved", body: result.data.name });
      onClose();
      void router.invalidate();
    } else if (result.error.code === "validation_failed") {
      const details = result.error.details ?? {};
      const refused = MEMBER_FIELDS.find((field) => details[field]);
      if (refused) document.getElementById(inputId(refused))?.focus();
    }
  }

  return (
    <SaleDialog
      title="Edit member"
      meta={member.name}
      className="member-edit"
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={(shortcut) => (
        <SubmitButton compact pending={action.pending} pendingLabel="Saving…">
          Save changes
          {shortcut}
        </SubmitButton>
      )}
    >
      <Field id={inputId("name")} label="Full name" error={error("name")}>
        <Input {...control("name")} className="input--compact" maxLength={200} onChange={(event) => set("name", event.target.value)} />
      </Field>
      <Field id={inputId("email")} label="Email" error={error("email")}>
        <Input {...control("email")} className="input--compact" type="email" maxLength={320} onChange={(event) => set("email", event.target.value)} />
      </Field>
      <div className="member-edit__pair">
        <Field id={inputId("phone")} label="Phone" error={error("phone")}>
          <Input {...control("phone")} className="input--compact" type="tel" maxLength={32} onChange={(event) => set("phone", event.target.value)} />
        </Field>
        <Field id={inputId("date_of_birth")} label="Date of birth" error={error("date_of_birth")}>
          <Input
            {...control("date_of_birth")}
            className="input--compact"
            type="date"
            min="1900-01-01"
            max={today}
            onChange={(event) => set("date_of_birth", event.target.value)}
          />
        </Field>
      </div>
      <div className="member-edit__pair">
        <Field id={inputId("emergency_contact_name")} label="Emergency contact" error={error("emergency_contact_name")}>
          <Input
            {...control("emergency_contact_name")}
            className="input--compact"
            maxLength={200}
            onChange={(event) => set("emergency_contact_name", event.target.value)}
          />
        </Field>
        <Field id={inputId("emergency_contact_phone")} label="Emergency phone" error={error("emergency_contact_phone")}>
          <Input
            {...control("emergency_contact_phone")}
            className="input--compact"
            type="tel"
            maxLength={32}
            onChange={(event) => set("emergency_contact_phone", event.target.value)}
          />
        </Field>
      </div>
      <Field id={inputId("note")} label="Note" hint="Only staff see the note." error={error("note")}>
        <Textarea
          {...control("note")}
          aria-describedby={describedBy(inputId("note"), "hint", error("note"))}
          className="input--compact member-edit__note"
          rows={3}
          maxLength={2000}
          onChange={(event) => set("note", event.target.value)}
        />
      </Field>
      {action.error && action.error.code !== "validation_failed" ? <FormNotice title="The member was not saved" error={action.error} /> : null}
    </SaleDialog>
  );
}

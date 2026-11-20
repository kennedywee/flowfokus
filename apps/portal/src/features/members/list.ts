/*
 * Pure helpers for the members list and the member forms. Rails validates
 * every write; the form checks only help staff fill the fields.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The list footer: "16 members", or "1–50 of 212 members" when there are pages. */
export function rangeLabel(first: number, shown: number, total: number): string {
  const noun = total === 1 ? "member" : "members";
  if (shown >= total) return `${total} ${noun}`;
  return `${first + 1}–${first + shown} of ${total} ${noun}`;
}

/** Rails accepts digits, spaces, and + ( ) . - in a phone number, five characters or more. */
const PHONE = /^\+?[0-9(][0-9 ().-]{4,}$/;

/** The fields staff fill for a member. Empty text means "no value". */
export interface MemberFields {
  name: string;
  email: string;
  phone: string;
  /** A calendar date as "YYYY-MM-DD", or "". */
  date_of_birth: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  note: string;
}

export type MemberField = keyof MemberFields;
export type MemberErrors = Partial<Record<MemberField, string>>;
export type NewMemberErrors = MemberErrors;

export const MEMBER_FIELD_LABEL: Record<MemberField, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  date_of_birth: "Date of birth",
  emergency_contact_name: "Emergency contact",
  emergency_contact_phone: "Emergency phone",
  note: "Note",
};

/** The fields in form order, so the first error gets the focus. */
export const MEMBER_FIELDS = Object.keys(MEMBER_FIELD_LABEL) as MemberField[];

/**
 * The checks a member form makes before it sends. Rails repeats them and
 * checks the email is free. `today` is "YYYY-MM-DD" in the organization's time zone.
 */
export function checkMember(fields: Partial<MemberFields>, today?: string): MemberErrors {
  const errors: MemberErrors = {};
  const phone = "Enter a phone number with digits only, for example +60 12 345 6789.";
  if (!fields.name?.trim()) errors.name = "Enter the member's full name.";
  if (!EMAIL.test(fields.email?.trim() ?? "")) errors.email = "Enter an email address, for example name@example.com.";
  if (fields.phone?.trim() && !PHONE.test(fields.phone.trim())) errors.phone = phone;
  if (fields.date_of_birth && today && fields.date_of_birth > today) errors.date_of_birth = "Enter a date that is not in the future.";
  if (fields.emergency_contact_phone?.trim() && !PHONE.test(fields.emergency_contact_phone.trim())) errors.emergency_contact_phone = phone;
  return errors;
}

/** The new member form's checks. */
export function checkNewMember(name: string, email: string, phone = ""): NewMemberErrors {
  return checkMember({ name, email, phone });
}

/** A member's fields as form text. */
export function memberFields(member: {
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  note: string | null;
}): MemberFields {
  return {
    name: member.name,
    email: member.email,
    phone: member.phone ?? "",
    date_of_birth: member.date_of_birth ?? "",
    emergency_contact_name: member.emergency_contact_name ?? "",
    emergency_contact_phone: member.emergency_contact_phone ?? "",
    note: member.note ?? "",
  };
}

/** "Rahman Ali · 012 555 0101", one part, or null when Rails has neither. */
export function emergencyContact(member: { emergency_contact_name: string | null; emergency_contact_phone: string | null }): string | null {
  const parts = [member.emergency_contact_name, member.emergency_contact_phone].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** A calendar date ("1994-03-09") as "9 Mar 1994". It has no time zone. */
export function formatBirthDate(date: string): string {
  return new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00Z`));
}

/** Today as "YYYY-MM-DD" in a time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * A Rails field error as a sentence. Rails sends "is already used by another
 * member"; the form shows "Email is already used by another member."
 */
export function fieldMessage(label: string, messages: string[] | undefined): string | undefined {
  if (!messages?.length) return undefined;
  return messages
    .map((message) => {
      const text = /^[a-z]/.test(message) ? `${label} ${message}` : message;
      return /[.!?]$/.test(text) ? text : `${text}.`;
    })
    .join(" ");
}

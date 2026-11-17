/*
 * Pure helpers for the members list and the new member form. Rails validates
 * every write; the form checks only help staff fill the fields.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The list footer: "16 members", or "1–50 of 212 members" when there are pages. */
export function rangeLabel(first: number, shown: number, total: number): string {
  const noun = total === 1 ? "member" : "members";
  if (shown >= total) return `${total} ${noun}`;
  return `${first + 1}–${first + shown} of ${total} ${noun}`;
}

export interface NewMemberErrors {
  name?: string;
  email?: string;
}

/** The checks the form makes before it sends. Rails repeats them and checks the email is free. */
export function checkNewMember(name: string, email: string): NewMemberErrors {
  const errors: NewMemberErrors = {};
  if (!name.trim()) errors.name = "Enter the member's full name.";
  if (!EMAIL.test(email.trim())) errors.email = "Enter an email address, for example name@example.com.";
  return errors;
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

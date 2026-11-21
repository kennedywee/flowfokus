/*
 * Pure helpers for the members list and the new member form. Rails validates
 * every write; the form checks only help staff fill the fields.
 */

import type { SortState } from "@/lib/list-parts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The columns staff can sort by. The ids are the list table's column ids. */
export const MEMBER_SORT_FIELDS = [
  { value: "name", label: "Name" },
  { value: "since", label: "Member since" },
] as const;

/** Rails returns members newest first, so that is the order staff see until they sort. */
export const DEFAULT_MEMBER_SORT: SortState = { column: "since", direction: "desc" };

/** The Display popover's column chips: the email line under the name, and the Member since column. */
export type MemberColumnId = "email" | "since";
export const DEFAULT_MEMBER_COLUMNS: Record<MemberColumnId, boolean> = { email: true, since: true };

interface SortableMember {
  name: string;
  created_at: string;
}

/**
 * The members in the chosen order. Names sort without regard to case or accents;
 * dates sort by the moment the member joined. A tie keeps the order Rails sent.
 */
export function sortMembers<M extends SortableMember>(members: readonly M[], sort: SortState): M[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const compare = (a: M, b: M) =>
    sort.column === "name"
      ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      : Date.parse(a.created_at) - Date.parse(b.created_at);
  return members
    .map((member, index) => ({ member, index }))
    .sort((a, b) => sign * compare(a.member, b.member) || a.index - b.index)
    .map(({ member }) => member);
}

/** True when sort and columns are what the page starts with. Reset to default then does nothing. */
export function isDefaultDisplay(sort: SortState, columns: Record<MemberColumnId, boolean>): boolean {
  return (
    sort.column === DEFAULT_MEMBER_SORT.column &&
    sort.direction === DEFAULT_MEMBER_SORT.direction &&
    columns.email === DEFAULT_MEMBER_COLUMNS.email &&
    columns.since === DEFAULT_MEMBER_COLUMNS.since
  );
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

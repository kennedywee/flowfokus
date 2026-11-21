/*
 * Sample records for the gallery examples. They are not Rails data and never
 * leave this folder: a screen shows only what Rails returns.
 */
import type { DotTone } from "@/components/parts/marks";

export interface SampleMember {
  id: string;
  name: string;
  initials: string;
  code: string;
  plan: string;
  renews: { label: string; left: number; tone: "good" | "warning" | "critical" };
  since: string;
  spent: string;
  due?: string;
  tags?: { label: string; tone: DotTone }[];
}

export const SAMPLE_MEMBERS: readonly SampleMember[] = [
  { id: "m1", name: "Ahmad Faiz", initials: "AF", code: "M-0402", plan: "Monthly unlimited", renews: { label: "Renews in 12d", left: 0.4, tone: "good" }, since: "Jan 2025", spent: "RM 2,640" },
  { id: "m2", name: "Daniel Wong", initials: "DW", code: "M-0047", plan: "Monthly unlimited", renews: { label: "Ends in 2d · Not renewing", left: 0.08, tone: "warning" }, since: "Aug 2022", spent: "RM 8,800" },
  { id: "m3", name: "Farah Aziz", initials: "FA", code: "M-0421", plan: "Monthly unlimited", renews: { label: "Renews in 30d", left: 1, tone: "good" }, since: "Feb 2025", spent: "RM 1,980", tags: [{ label: "Corporate · Acme", tone: "violet" }] },
  { id: "m4", name: "Hafiz Rahman", initials: "HR", code: "M-0388", plan: "Monthly unlimited", renews: { label: "Renews in 27d", left: 0.9, tone: "good" }, since: "Nov 2024", spent: "RM 1,800", due: "RM 100.00", tags: [{ label: "Student rate", tone: "warning" }] },
  { id: "m5", name: "Jason Teo", initials: "JT", code: "M-0198", plan: "10-class pass", renews: { label: "7 of 10 left", left: 0.7, tone: "good" }, since: "May 2023", spent: "RM 3,150" },
  { id: "m6", name: "Kumar Raj", initials: "KR", code: "M-0219", plan: "Monthly unlimited", renews: { label: "Renews in 4d", left: 0.14, tone: "good" }, since: "Jun 2023", spent: "RM 6,420", tags: [{ label: "PT client", tone: "good" }] },
];

export const MEMBER_COLUMNS = [
  { id: "name", label: "Member", sortable: true },
  { id: "plan", label: "Plan", width: "190px" },
  { id: "since", label: "Member since", width: "110px", sortable: true },
  { id: "spent", label: "Spent", width: "100px", align: "end" as const, sortable: true },
  { id: "due", label: "Balance due", width: "110px", align: "end" as const },
];

export interface SampleBooking {
  id: string;
  name: string;
  initials: string;
  plan: string;
  when: string;
  group: "here" | "arrive" | "cancelled";
}

export const SAMPLE_BOOKINGS: readonly SampleBooking[] = [
  { id: "b1", name: "Priya Nair", initials: "PN", plan: "Monthly unlimited", when: "06:32", group: "here" },
  { id: "b2", name: "Ahmad Faiz", initials: "AF", plan: "Monthly unlimited", when: "06:35", group: "here" },
  { id: "b3", name: "Ben Tan", initials: "BT", plan: "10-class pass", when: "Yesterday", group: "arrive" },
  { id: "b4", name: "Sara Lee", initials: "SL", plan: "Drop-in", when: "Today", group: "arrive" },
  { id: "b5", name: "Jason Teo", initials: "JT", plan: "10-class pass", when: "Mon", group: "arrive" },
  { id: "b6", name: "Nurul Huda", initials: "NH", plan: "Monthly unlimited", when: "Today", group: "arrive" },
  { id: "b7", name: "Lim Wei Jie", initials: "LW", plan: "Monthly unlimited", when: "Today", group: "cancelled" },
];

export const BOOKING_COLUMNS = [
  { id: "name", label: "Member" },
  { id: "plan", label: "Booked with", width: "180px" },
  { id: "when", label: "Last visit", width: "80px", align: "end" as const },
];

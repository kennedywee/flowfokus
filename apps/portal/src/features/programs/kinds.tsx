import type { Schemas } from "@flowfokus/api";
import { Clock, Ticket, Users, type LucideIcon } from "lucide-react";

/** Paper's kind icons: two people for a group class, a ticket for an event, a clock for an appointment. */
export const KIND_ICON: Record<Schemas["ProgramKind"], LucideIcon> = {
  group_class: Users,
  event: Ticket,
  appointment: Clock,
};

/** The grey tile before a program's name. `size` is 28 on list rows and 40 on the page head. */
export function KindTile({ kind, size = 28 }: { kind: Schemas["ProgramKind"]; size?: 28 | 40 }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className="program-tile" data-size={size} aria-hidden="true">
      <Icon strokeWidth={1.75} aria-hidden="true" focusable="false" />
    </span>
  );
}

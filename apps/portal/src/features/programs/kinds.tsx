import type { Schemas } from "@flowfokus/api";
import { Icon, type IconName } from "@/components/ui/icon";

/** Paper's kind icons: two people for a group class, a ticket for an event, a clock for an appointment. */
export const KIND_ICON: Record<Schemas["ProgramKind"], IconName> = {
  group_class: "members",
  event: "pass",
  appointment: "length",
};

/** The grey tile before a program's name. `size` is 28 on list rows and 40 on the page head. */
export function KindTile({ kind, size = 28 }: { kind: Schemas["ProgramKind"]; size?: 28 | 40 }) {
  const iconName = KIND_ICON[kind];
  return (
    <span className="program-tile" data-size={size} aria-hidden="true">
      <Icon name={iconName} aria-hidden="true" focusable="false" />
    </span>
  );
}

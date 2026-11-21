import type { Schemas } from "@flowfokus/api";
import { Icon, type IconName } from "@/components/ui/icon";

/** Paper's kind icons: the set's group class, event, and appointment glyphs. */
export const KIND_ICON: Record<Schemas["ProgramKind"], IconName> = {
  group_class: "groupClass",
  event: "event",
  appointment: "appointment",
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

import { Icon } from "@/components/ui/icon";
import { useCan } from "../lib/organization";
import type { Permission } from "@flowfokus/api";
import { useModKeyLabel } from "../lib/shortcuts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const icon = { "aria-hidden": true, focusable: false } as const;

type Shortcut = { keys: string[]; label: string };
export type ShortcutGroup = { title: string; items: Shortcut[] };

/**
 * The shortcuts that work for this role, grouped by where they work. Keep this
 * list in step with the `useShortcut` calls and their `enabled` checks: a key
 * listed here must work where it says. Empty groups are left out.
 */
export function shortcutGroups(mod: string, can: (permission: Permission) => boolean): ShortcutGroup[] {
  const lists = [
    can("members:read") ? "Members" : null,
    can("purchases:read") ? "Sales" : null,
    can("programs:read") ? "Programs" : null,
    can("products:read") ? "Products" : null,
  ].filter((name): name is string => name !== null);
  const groups: ShortcutGroup[] = [
    {
      title: "Anywhere",
      items: [
        { keys: [`${mod}K`], label: "Search members and pages" },
        { keys: [`${mod},`], label: "Settings" },
        { keys: [`${mod}B`], label: "Show or hide the sidebar" },
        { keys: ["?"], label: "Keyboard shortcuts" },
      ],
    },
    {
      title: "Member page",
      items: [
        ...(can("check_ins:create") ? [{ keys: ["C"], label: "Check in" }] : []),
        ...(can("purchases:create") ? [{ keys: ["S"], label: "Sell" }] : []),
      ],
    },
    {
      title: lists.length > 1 ? `${lists.slice(0, -1).join(", ")} and ${lists.at(-1)}` : (lists[0] ?? ""),
      items: lists.length ? [{ keys: ["/"], label: "Search the list" }] : [],
    },
    {
      title: "Sale page",
      items: can("purchases:read")
        ? [
            ...(can("payments:create") ? [{ keys: ["P"], label: "Record payment" }] : []),
            ...(can("purchases:fulfill") ? [{ keys: ["F"], label: "Fulfill" }] : []),
          ]
        : [],
    },
    {
      title: "Program page",
      items: can("programs:read")
        ? [
            ...(can("programs:manage") ? [{ keys: ["T"], label: "Add sessions" }] : []),
            ...(can("purchases:create") ? [{ keys: ["S"], label: "Sell ticket" }] : []),
            ...(can("bookings:create") || can("purchases:create") ? [{ keys: ["B"], label: "Book member" }] : []),
            ...(can("programs:manage") ? [{ keys: ["⇧P"], label: "Publish or make staff only" }] : []),
          ]
        : [],
    },
    {
      title: "Product page",
      items: can("products:read")
        ? [
            ...(can("purchases:create") ? [{ keys: ["S"], label: "Sell" }] : []),
            ...(can("products:update") ? [{ keys: ["E"], label: "Edit product" }] : []),
          ]
        : [],
    },
    {
      title: "Session page",
      items: can("programs:read")
        ? [
            ...(can("bookings:create") || can("purchases:create") ? [{ keys: ["B"], label: "Book member" }] : []),
            ...(can("bookings:manage") ? [{ keys: ["A"], label: "Mark the focused booking attended" }] : []),
          ]
        : [],
    },
    {
      title: "Forms and dialogs",
      items: [{ keys: [`${mod}↵`], label: "Submit, where the button shows it" }],
    },
  ];
  return groups.filter((group) => group.items.length > 0);
}

export function KeyboardShortcuts({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const mod = useModKeyLabel();
  const can = useCan();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-dialog shortcuts-dialog">
        <div className="sale-dialog__head">
          <DialogTitle className="sale-dialog__title">Keyboard shortcuts</DialogTitle>
          <button type="button" className="sale-dialog__close" onClick={() => onOpenChange(false)}>
            <Icon name="close" {...icon} />
            <span className="visually-hidden">Close</span>
          </button>
        </div>
        <div className="sale-dialog__body shortcuts-dialog__body">
          {shortcutGroups(mod, can).map((group) => (
            <section key={group.title} className="shortcuts-dialog__group">
              <h3>{group.title}</h3>
              <dl>
                {group.items.map((item) => (
                  <div key={item.label} className="shortcuts-dialog__row">
                    <dt>{item.label}</dt>
                    <dd>
                      {item.keys.map((key) => (
                        <kbd key={key} className="kbd">
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

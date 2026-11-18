import { X } from "lucide-react";
import { useModKeyLabel } from "../lib/shortcuts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

type Shortcut = { keys: string[]; label: string };

/**
 * Every shortcut the portal has, grouped by where it works. Keep this list in
 * step with `useShortcut` calls: a key listed here must work where it says.
 */
function groups(mod: string): { title: string; items: Shortcut[] }[] {
  return [
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
      title: "Home and member page",
      items: [
        { keys: ["C"], label: "Check in" },
        { keys: ["S"], label: "Sell" },
      ],
    },
    {
      title: "Members, Sales, and Check-ins",
      items: [{ keys: ["/"], label: "Search the list" }],
    },
    {
      title: "Sale page",
      items: [
        { keys: ["P"], label: "Record payment" },
        { keys: ["F"], label: "Fulfill" },
      ],
    },
    {
      title: "Session page",
      items: [
        { keys: ["B"], label: "Book member" },
        { keys: ["A"], label: "Mark the focused booking attended" },
      ],
    },
    {
      title: "Forms and dialogs",
      items: [{ keys: [`${mod}↵`], label: "Create or save" }],
    },
  ];
}

export function KeyboardShortcuts({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const mod = useModKeyLabel();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-dialog shortcuts-dialog">
        <div className="sale-dialog__head">
          <DialogTitle className="sale-dialog__title">Keyboard shortcuts</DialogTitle>
          <button type="button" className="sale-dialog__close" onClick={() => onOpenChange(false)}>
            <X {...icon} />
            <span className="visually-hidden">Close</span>
          </button>
        </div>
        <div className="sale-dialog__body shortcuts-dialog__body">
          {groups(mod).map((group) => (
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

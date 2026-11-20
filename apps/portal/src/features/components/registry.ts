/**
 * The component gallery's entries: one per built component or block.
 *
 * Each example names a file in `./examples/`. The gallery renders that file
 * and shows its source, so the preview and the code cannot drift apart.
 * Only components with code belong here. A design without code stays in Paper.
 */

export type GalleryGroup = "Core" | "Complex" | "Data" | "Blocks";

export const GALLERY_GROUPS: readonly GalleryGroup[] = ["Core", "Complex", "Data", "Blocks"];

/** The component pages in the Paper file "Flowfokus Redesign". */
const PAPER_FILE = "https://app.paper.design/file/01M6FWEABX58V0RANJNQW72ZPN";
export const PAPER_PAGES = {
  "Components — Core": `${PAPER_FILE}/p-Z-0`,
  "Components — Complex": `${PAPER_FILE}/p-10-0`,
  "Components — Data": `${PAPER_FILE}/p-11-0`,
  "Experimental — Hold to confirm": `${PAPER_FILE}/p-13-0`,
} as const;

export type PaperPage = keyof typeof PAPER_PAGES;

export interface GalleryExample {
  /** A file name in `./examples/`, without `.tsx`. */
  file: string;
  title: string;
  /** One sentence, only when the title does not say enough. */
  note?: string;
}

export interface GalleryProp {
  name: string;
  type: string;
  default?: string;
  note: string;
}

export interface GalleryEntry {
  slug: string;
  name: string;
  group: GalleryGroup;
  /** One line: what the component is for. */
  summary: string;
  /** Source files, relative to `apps/portal/src`. */
  source: readonly string[];
  /** The Paper board that specifies it. */
  paper?: { page: PaperPage; board: string };
  examples: readonly GalleryExample[];
  props?: readonly GalleryProp[];
}

export const GALLERY: readonly GalleryEntry[] = [
  // Core
  {
    slug: "button",
    name: "Button",
    group: "Core",
    summary: "An action. One primary per decision group; alternatives are secondary or ghost.",
    source: ["components/ui/button.tsx", "components/ui.tsx"],
    paper: { page: "Components — Core", board: "Buttons" },
    examples: [
      { file: "button-variants", title: "Variants" },
      { file: "button-sizes", title: "Sizes" },
      { file: "button-states", title: "States", note: "Use SubmitButton for a pending form submit." },
      { file: "button-link", title: "Link styled as a button", note: "Keep link semantics: put buttonVariants on a router Link." },
    ],
    props: [
      { name: "variant", type: '"default" | "secondary" | "ghost" | "destructive"', default: '"default"', note: '"outline" is an alias of "secondary".' },
      { name: "size", type: '"default" | "sm" | "lg" | "compact" | "icon" | "icon-sm" | "icon-compact"', default: '"default"', note: "Compact is the 28px top-bar size." },
      { name: "disabled", type: "boolean", note: "CSS supplies the look." },
    ],
  },
  {
    slug: "badge",
    name: "Badge",
    group: "Core",
    summary: "A short label. A pill always shows an icon and a label, never colour alone.",
    source: ["components/ui/badge.tsx"],
    paper: { page: "Components — Core", board: "Badges, status, tags, small parts" },
    examples: [
      { file: "badge-tones", title: "Tones" },
      { file: "badge-variants", title: "Variants" },
    ],
    props: [
      { name: "variant", type: '"pill" | "square" | "tag" | "demo"', default: '"pill"', note: "Demo marks sample data." },
      { name: "tone", type: '"good" | "warning" | "critical" | "info" | "neutral"', note: "Sets the wash and the text colour." },
    ],
  },
  {
    slug: "status",
    name: "Status and Pill",
    group: "Core",
    summary: "A record's state as an icon and a label. Use the Rails response, not the requested outcome.",
    source: ["components/ui.tsx"],
    paper: { page: "Components — Core", board: "Badges, status, tags, small parts" },
    examples: [
      { file: "status-states", title: "Status" },
      { file: "status-pill", title: "Pill with your own icon" },
      { file: "status-lamp", title: "Lamp", note: "The icon alone. Always put a text label beside it." },
    ],
    props: [
      { name: "state", type: "LampState", note: "off, granted, denied, paid, due, waiting, fulfilled, active, error." },
      { name: "children", type: "ReactNode", note: "The visible label." },
    ],
  },
  {
    slug: "input",
    name: "Input and Textarea",
    group: "Core",
    summary: "Text entry. Put it in a Field so the label, hint and error are linked.",
    source: ["components/ui/input.tsx", "components/ui/textarea.tsx"],
    paper: { page: "Components — Core", board: "Text fields" },
    examples: [
      { file: "input-basic", title: "Input" },
      { file: "input-textarea", title: "Textarea" },
      { file: "input-small", title: "Small" },
    ],
  },
  {
    slug: "field",
    name: "Field",
    group: "Core",
    summary: "A label, a control, an optional hint and an optional error, wired for assistive technology.",
    source: ["components/ui.tsx", "components/ui/field.tsx", "components/ui/label.tsx"],
    paper: { page: "Components — Core", board: "Text fields" },
    examples: [
      { file: "field-hint", title: "With a hint" },
      { file: "field-error", title: "With an error", note: "describedBy links the hint and the error; aria-invalid marks the control." },
    ],
    props: [
      { name: "id", type: "string", note: "Must match the control's id." },
      { name: "label", type: "string", note: "Always visible." },
      { name: "hint", type: "string", note: "Only when the label is not enough." },
      { name: "error", type: "string", note: "Says what to do next." },
    ],
  },
  {
    slug: "native-select",
    name: "Native select",
    group: "Core",
    summary: "A choice from a short list, with the platform picker.",
    source: ["components/ui/native-select.tsx"],
    paper: { page: "Components — Core", board: "Text fields" },
    examples: [{ file: "native-select-basic", title: "Select" }],
  },
  {
    slug: "checkbox",
    name: "Checkbox",
    group: "Core",
    summary: "An on/off choice in a form or a list. Name it with a label.",
    source: ["components/ui/checkbox.tsx"],
    paper: { page: "Components — Core", board: "Checkbox, radio, switch" },
    examples: [{ file: "checkbox-states", title: "States" }],
    props: [
      { name: "checked", type: "boolean", note: "Controlled value." },
      { name: "indeterminate", type: "boolean", note: "Shows the mixed state, for a select-all box." },
      { name: "onCheckedChange", type: "(checked: boolean) => void", note: "From ui-sdk." },
    ],
  },
  {
    slug: "switch",
    name: "Switch",
    group: "Core",
    summary: "A setting that applies at once.",
    source: ["components/ui/switch.tsx"],
    paper: { page: "Components — Core", board: "Checkbox, radio, switch" },
    examples: [{ file: "switch-basic", title: "Switch" }],
  },
  {
    slug: "toggle-group",
    name: "Toggle group",
    group: "Core",
    summary: "A row of quiet buttons where one stays pressed. Arrow keys move between them.",
    source: ["components/ui/toggle-group.tsx"],
    examples: [{ file: "toggle-group-basic", title: "Single choice" }],
  },
  {
    slug: "avatar",
    name: "Avatar",
    group: "Core",
    summary: "A person's initials in a neutral circle.",
    source: ["components/ui.tsx", "components/ui/avatar.tsx"],
    paper: { page: "Components — Core", board: "Badges, status, tags, small parts" },
    examples: [{ file: "avatar-sizes", title: "Sizes" }],
    props: [
      { name: "name", type: "string", note: "Initials come from it." },
      { name: "size", type: "number", default: "24", note: "Pixels." },
    ],
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    group: "Core",
    summary: "A short label on hover or keyboard focus, for icon buttons.",
    source: ["components/ui/tooltip.tsx"],
    examples: [{ file: "tooltip-basic", title: "Icon button" }],
  },
  {
    slug: "kbd",
    name: "Kbd",
    group: "Core",
    summary: "A keyboard shortcut hint. Show it only for shortcuts that work.",
    source: ["components/ui.tsx"],
    examples: [{ file: "kbd-basic", title: "Shortcut hints" }],
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    group: "Core",
    summary: "A loading bar that holds the space of the content to come.",
    source: ["components/ui/skeleton.tsx", "components/ui.tsx"],
    examples: [
      { file: "skeleton-basic", title: "Bars" },
      { file: "skeleton-rows", title: "SkeletonRows" },
    ],
  },
  {
    slug: "alert",
    name: "Notice",
    group: "Core",
    summary: "Inline feedback with an icon, a title and a sentence. Error text gives a next step.",
    source: ["components/ui.tsx", "components/ui/alert.tsx"],
    examples: [
      { file: "alert-tones", title: "Tones" },
      { file: "alert-action", title: "With an action" },
    ],
    props: [
      { name: "tone", type: '"info" | "error" | "warning" | "success"', default: '"info"', note: "Sets the icon and colour." },
      { name: "title", type: "string", note: "One line." },
      { name: "action", type: "ReactNode", note: "One button, on the right." },
      { name: "live", type: "boolean", note: "Announce it. Only for feedback that changed." },
    ],
  },
  {
    slug: "card",
    name: "Plate",
    group: "Core",
    summary: "A named section with a body and an optional action and footer. Also exported as Card.",
    source: ["components/ui.tsx", "components/ui/card.tsx"],
    examples: [
      { file: "card-basic", title: "Plate" },
      { file: "card-footer", title: "With an action and a footer" },
    ],
    props: [
      { name: "title", type: "string", note: "Names the section." },
      { name: "action", type: "ReactNode", note: "Top right." },
      { name: "flush", type: "boolean", note: "No body padding, for a table that runs edge to edge." },
      { name: "footer", type: "ReactNode", note: "Totals or actions." },
    ],
  },
  {
    slug: "empty",
    name: "Empty, error and loading",
    group: "Core",
    summary: "A collection with nothing to show: no records, a failed load, or a load in progress.",
    source: ["components/ui.tsx", "components/ui/empty.tsx"],
    paper: { page: "Components — Complex", board: "Page states" },
    examples: [
      { file: "empty-basic", title: "Empty" },
      { file: "empty-error", title: "ErrorState" },
      { file: "empty-loading", title: "LoadingState" },
    ],
  },

  // Complex
  {
    slug: "dialog",
    name: "Dialog",
    group: "Complex",
    summary: "A modal for one task or a picker. Creation is a full page, not a dialog.",
    source: ["components/ui/dialog.tsx"],
    paper: { page: "Components — Complex", board: "Dialogs and side panel" },
    examples: [{ file: "dialog-basic", title: "Dialog" }],
  },
  {
    slug: "confirm-dialog",
    name: "Confirm dialog",
    group: "Complex",
    summary: "One consequential decision. Critical tone starts focus on Cancel.",
    source: ["components/ConfirmDialog.tsx", "components/ui/alert-dialog.tsx"],
    paper: { page: "Components — Complex", board: "Dialogs and side panel" },
    examples: [
      { file: "confirm-dialog-default", title: "Default" },
      { file: "confirm-dialog-critical", title: "Critical" },
    ],
    props: [
      { name: "open", type: "boolean", note: "The parent owns it." },
      { name: "title", type: "string", note: "A question that names the record." },
      { name: "confirmLabel", type: "string", note: "Repeat the action and the amount." },
      { name: "pending", type: "boolean", note: "Ignores Escape and Cancel while true." },
      { name: "tone", type: '"default" | "critical"', default: '"default"', note: "Critical for actions that cannot be undone." },
    ],
  },
  {
    slug: "hold-button",
    name: "Hold button",
    group: "Complex",
    summary: "A safe action that must not fire on a stray click. Press and hold for 600 ms to confirm.",
    source: ["components/ui/hold-button.tsx"],
    paper: { page: "Experimental — Hold to confirm", board: "A · Hold button — frames" },
    examples: [
      { file: "hold-button-variants", title: "Variants", note: "Secondary for row and card actions; primary for a top-bar action that commits a record." },
      { file: "hold-button-request", title: "Confirmed until the request settles" },
    ],
    props: [
      { name: "onConfirm", type: "() => unknown", note: "Runs once the hold completes. Return a Promise to keep the success state until it settles." },
      { name: "holdLabel", type: "string", note: "The hint, such as \"Hold to check in\". It is also the accessible description." },
      { name: "confirmedLabel", type: "ReactNode", note: "Shown while the request runs, such as \"Checked in\"." },
      { name: "variant", type: '"secondary" | "default"', default: '"secondary"', note: '"default" is the primary fill.' },
    ],
  },
  {
    slug: "dropdown-menu",
    name: "Dropdown menu",
    group: "Complex",
    summary: "A menu from a button: commands, one choice, or several checks.",
    source: ["components/ui/dropdown-menu.tsx"],
    paper: { page: "Components — Complex", board: "Menus" },
    examples: [
      { file: "dropdown-menu-basic", title: "Commands" },
      { file: "dropdown-menu-choices", title: "Radio and checkbox items" },
    ],
  },
  {
    slug: "combobox",
    name: "Combobox",
    group: "Complex",
    summary: "A text box that filters a list and picks one item, for a form value.",
    source: ["components/Combobox.tsx", "components/ui/combobox.tsx"],
    examples: [{ file: "combobox-basic", title: "Pick a member" }],
    props: [
      { name: "options", type: "{ value; label; detail? }[]", note: "Filtered on label and detail." },
      { name: "value", type: "string | null", note: "The picked value." },
      { name: "onChange", type: "(value: string | null) => void", note: "Null when the text box is emptied." },
    ],
  },
  {
    slug: "command",
    name: "Command",
    group: "Complex",
    summary: "A searchable list of actions. In a dialog, it is the ⌘K palette.",
    source: ["components/ui/command.tsx", "components/CommandMenu.tsx"],
    paper: { page: "Components — Complex", board: "Search palette and toasts" },
    examples: [{ file: "command-basic", title: "Inline list" }],
  },
  {
    slug: "sheet",
    name: "Sheet",
    group: "Complex",
    summary: "A panel that slides in from the left: the phone navigation drawer.",
    source: ["components/ui/sheet.tsx", "styles/shell.css"],
    paper: { page: "Components — Complex", board: "Sidebar" },
    examples: [{ file: "sheet-basic", title: "Drawer" }],
  },
  {
    slug: "toast",
    name: "Toast",
    group: "Complex",
    summary: "Feedback after an action, at the bottom, with at most one action.",
    source: ["components/Toast.tsx"],
    paper: { page: "Components — Complex", board: "Search palette and toasts" },
    examples: [{ file: "toast-tones", title: "Tones" }],
    props: [
      { name: "tone", type: '"success" | "error" | "info"', note: "Sets the icon." },
      { name: "title", type: "string", note: "What happened." },
      { name: "body", type: "string", note: "Optional detail." },
      { name: "action", type: "{ label; onClick }", note: "One action, such as Undo or Try again." },
    ],
  },

  // Data
  {
    slug: "list-toolbar",
    name: "List toolbar",
    group: "Data",
    summary: "Filter and chips on the left, search on the right, above every list.",
    source: ["components/ListToolbar.tsx"],
    paper: { page: "Components — Data", board: "Table toolbar" },
    examples: [{ file: "list-toolbar-basic", title: "Filter, chips and search" }],
  },
  {
    slug: "table-state",
    name: "Table state",
    group: "Data",
    summary: "A list with no rows: empty keeps the header band and a skeleton; no results shows the panel alone.",
    source: ["components/TableState.tsx"],
    paper: { page: "Components — Data", board: "Table" },
    examples: [
      { file: "table-state-empty", title: "Empty" },
      { file: "table-state-no-results", title: "No results" },
    ],
  },
  {
    slug: "list-pager",
    name: "List pager",
    group: "Data",
    summary: "The footer of a top-level list: the range and the page buttons.",
    source: ["components/ListPager.tsx"],
    paper: { page: "Components — Data", board: "Table" },
    examples: [{ file: "list-pager-basic", title: "Pages" }],
  },

  // Blocks
  {
    slug: "page-head",
    name: "Page head",
    group: "Blocks",
    summary: "A page's title, record facts and actions. Actions move to the top bar on wider screens.",
    source: ["components/ui.tsx", "components/PageActions.tsx"],
    paper: { page: "Components — Complex", board: "Page head and tabs" },
    examples: [{ file: "page-head-basic", title: "Title, meta and actions" }],
    props: [
      { name: "title", type: "string", note: "The page title." },
      { name: "meta", type: "ReactNode", note: "Record metadata, such as a date. Not a subtitle." },
      { name: "children", type: "ReactNode", note: "Facts beside the title, such as a status." },
      { name: "actions", type: "ReactNode", note: "Placed in the top bar from 768px." },
    ],
  },
  {
    slug: "sale-marks",
    name: "Payment and fulfillment marks",
    group: "Blocks",
    summary: "A sale's two separate facts: how it is paid and whether it is fulfilled. Never merge them.",
    source: ["features/sales/SaleFacts.tsx", "features/sales/facts.ts"],
    examples: [{ file: "sale-marks-states", title: "States" }],
  },
  {
    slug: "form-notice",
    name: "Form notice",
    group: "Blocks",
    summary: "A form's failed request in one line. The fields keep their values.",
    source: ["components/FormNotice.tsx"],
    paper: { page: "Components — Complex", board: "Forms" },
    examples: [{ file: "form-notice-basic", title: "Failed save" }],
  },
  {
    slug: "money-time",
    name: "Money and Time",
    group: "Blocks",
    summary: "Domain values with equal-width figures, in the organization's currency and time zone.",
    source: ["components/ui.tsx", "lib/format.ts"],
    examples: [{ file: "money-time-basic", title: "Money and Time" }],
  },
];

export function findEntry(slug: string): GalleryEntry | undefined {
  return GALLERY.find((entry) => entry.slug === slug);
}

/** Entries by group, in the order of GALLERY_GROUPS. */
export function groupedEntries(entries: readonly GalleryEntry[] = GALLERY) {
  return GALLERY_GROUPS.map((group) => ({ group, entries: entries.filter((entry) => entry.group === group) }));
}

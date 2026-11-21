/**
 * The component gallery's entries: one per built component or block.
 *
 * Each example names a file in `./examples/`. The gallery renders that file
 * and shows its source, so the preview and the code cannot drift apart.
 * Only components with code belong here. A design without code stays in Paper.
 */

export type GalleryGroup = "Core" | "Complex" | "Data" | "Blocks";

export const GALLERY_GROUPS: readonly GalleryGroup[] = ["Core", "Complex", "Data", "Blocks"];

/**
 * Paper boards. "Flowfokus Design" is the reference for the portal. Its file
 * has no component boards yet; the Core, Complex, Data, and Hold-to-confirm
 * boards are still in the earlier file "Flowfokus Redesign".
 */
const DESIGN_FILE = "https://app.paper.design/file/01M7X4HENFQVWCFYKJH6A9QSXD";
const REDESIGN_FILE = "https://app.paper.design/file/01M6FWEABX58V0RANJNQW72ZPN";
export const PAPER_PAGES = {
  "Flowfokus Design — Icons": `${DESIGN_FILE}/p-6-0`,
  "Flowfokus Design — Member details": `${DESIGN_FILE}/p-1-0`,
  "Flowfokus Design — Program details": `${DESIGN_FILE}/p-9-0`,
  "Flowfokus Design — Members": `${DESIGN_FILE}/p-D-0`,
  "Flowfokus Design — Session details": `${DESIGN_FILE}/p-A-0`,
  "Flowfokus Design — Calendar": `${DESIGN_FILE}/p-B-0`,
  "Flowfokus Design — Sale details": `${DESIGN_FILE}/p-8-0`,
  "Flowfokus Design — Product details": `${DESIGN_FILE}/p-C-0`,
  "Flowfokus Design — Pass credits": `${DESIGN_FILE}/p-5-0`,
  "Flowfokus Design — Settings": `${DESIGN_FILE}/p-E-0`,
  "Flowfokus Redesign — Components — Core": `${REDESIGN_FILE}/p-Z-0`,
  "Flowfokus Redesign — Components — Complex": `${REDESIGN_FILE}/p-10-0`,
  "Flowfokus Redesign — Components — Data": `${REDESIGN_FILE}/p-11-0`,
  "Flowfokus Redesign — Experimental — Hold to confirm": `${REDESIGN_FILE}/p-13-0`,
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
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Buttons" },
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
    slug: "icon",
    name: "Icon",
    group: "Core",
    summary: "One icon from the portal's own set. Every icon in the portal comes from here; there is no other icon library.",
    source: ["components/ui/icon.tsx"],
    paper: { page: "Flowfokus Design — Icons", board: "Icon set — Attuna" },
    examples: [
      { file: "icon-set", title: "The set", note: "A 16px grid, a 1.25 stroke, and round ends. Icons draw in the text colour." },
      { file: "icon-status", title: "Status icons", note: "The parent sets the tone. A grey part uses --color-ink-3." },
    ],
    props: [
      { name: "name", type: "IconName", note: "A name from ICON_NAMES. Add a new icon to the Paper page first." },
      { name: "size", type: "number", default: "16", note: "Width and height in px." },
      { name: "aria-label", type: "string", note: "Hidden from assistive technology unless named. Put a text label beside it, or name the control." },
    ],
  },
  {
    slug: "badge",
    name: "Badge",
    group: "Core",
    summary: "A short label. A pill always shows an icon and a label, never colour alone.",
    source: ["components/ui/badge.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Badges, status, tags, small parts" },
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
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Badges, status, tags, small parts" },
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
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Text fields" },
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
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Text fields" },
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
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Text fields" },
    examples: [{ file: "native-select-basic", title: "Select" }],
  },
  {
    slug: "checkbox",
    name: "Checkbox",
    group: "Core",
    summary: "An on/off choice in a form or a list. Name it with a label.",
    source: ["components/ui/checkbox.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Checkbox, radio, switch" },
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
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Checkbox, radio, switch" },
    examples: [{ file: "switch-basic", title: "Switch" }],
  },
  {
    slug: "toggle-group",
    name: "Toggle group",
    group: "Core",
    summary: "A row of quiet buttons where one stays pressed. Arrow keys move between them.",
    source: ["components/ui/toggle-group.tsx"],
    examples: [
      { file: "toggle-group-basic", title: "Single choice" },
      { file: "toggle-group-multiple", title: "Several pressed at once", note: "The Calendar's kinds row. Sample counts." },
    ],
  },
  {
    slug: "segmented-control",
    name: "Segmented control",
    group: "Core",
    summary: "Two to four views where one is chosen, with an indicator that slides to it. Built on ui-sdk (#69).",
    source: ["components/ui/segmented-control.tsx"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Light" },
    examples: [{ file: "segmented-control-basic", title: "All, Comments, Activity" }],
    props: [
      { name: "value / onValueChange", type: "string", note: "The chosen item. Arrow keys move between items; the control has one tab stop." },
      { name: "aria-label", type: "string", note: "Names the group, for example Show." },
    ],
  },
  {
    slug: "avatar",
    name: "Avatar",
    group: "Core",
    summary: "A person's initials in a neutral circle.",
    source: ["components/ui.tsx", "components/ui/avatar.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Core", board: "Badges, status, tags, small parts" },
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
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Page states" },
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
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Dialogs and side panel" },
    examples: [{ file: "dialog-basic", title: "Dialog" }],
  },
  {
    slug: "confirm-dialog",
    name: "Confirm dialog",
    group: "Complex",
    summary: "One consequential decision. Critical tone starts focus on Cancel.",
    source: ["components/ConfirmDialog.tsx", "components/ui/alert-dialog.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Dialogs and side panel" },
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
    paper: { page: "Flowfokus Redesign — Experimental — Hold to confirm", board: "A · Hold button — frames" },
    examples: [
      { file: "hold-button-variants", title: "Variants", note: "Secondary for row and card actions; primary for a top-bar action that commits a record." },
      { file: "hold-button-request", title: "Confirmed until the request settles" },
      { file: "hold-button-ring", title: "Ring", note: "A row action with no room for a label. Name it with aria-label." },
      { file: "hold-button-dots", title: "Dotted fill", note: "Same jobs as the sweep, where the page already uses dotted bars." },
      { file: "hold-button-shortcut", title: "Shortcut hold", note: "Hold C anywhere on the page. A tap does nothing." },
    ],
    props: [
      { name: "onConfirm", type: "() => unknown", note: "Runs once the hold completes. Return a Promise to keep the success state until it settles." },
      { name: "holdLabel", type: "string", note: "The hint, such as \"Hold to check in\". It is also the accessible description." },
      { name: "confirmedLabel", type: "ReactNode", note: "Shown while the request runs, such as \"Checked in\"." },
      { name: "variant", type: '"secondary" | "default"', default: '"secondary"', note: '"default" is the primary fill.' },
      { name: "fill", type: '"sweep" | "dots" | "line" | "ring"', default: '"sweep"', note: "How the hold shows progress. A ring takes an icon and an aria-label." },
      { name: "shortcut", type: "string", note: "A single key. Holding it anywhere on the page holds the button." },
    ],
  },
  {
    slug: "popover",
    name: "Popover",
    group: "Complex",
    summary: "A small panel beside its trigger. Focus moves in, Escape closes it, and focus returns to the trigger. Built on ui-sdk (#69).",
    source: ["components/ui/popover.tsx"],
    paper: { page: "Flowfokus Design — Members", board: "Members — few filters + Display open" },
    examples: [{ file: "popover-basic", title: "With focus trap" }],
    props: [
      { name: "modal", type: '"trap-focus" | boolean', default: "false", note: 'Use "trap-focus" for a panel with several controls, such as Display.' },
      { name: "PopoverTitle", type: "ReactNode", note: "Names the dialog. Hide it with visually-hidden when the panel shows its own heading." },
    ],
  },
  {
    slug: "collapsible",
    name: "Collapsible",
    group: "Complex",
    summary: "One panel that shows and hides, with aria-expanded on the trigger. List groups use it.",
    source: ["components/ui/collapsible.tsx"],
    examples: [{ file: "collapsible-basic", title: "Open by default" }],
  },
  {
    slug: "dropdown-menu",
    name: "Dropdown menu",
    group: "Complex",
    summary: "A menu from a button: commands, one choice, or several checks.",
    source: ["components/ui/dropdown-menu.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Menus" },
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
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Search palette and toasts" },
    examples: [{ file: "command-basic", title: "Inline list" }],
  },
  {
    slug: "sheet",
    name: "Sheet",
    group: "Complex",
    summary: "A panel that slides in from the left: the phone navigation drawer.",
    source: ["components/ui/sheet.tsx", "styles/shell.css"],
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Sidebar" },
    examples: [{ file: "sheet-basic", title: "Drawer" }],
  },
  {
    slug: "context-switcher",
    name: "Context switcher",
    group: "Complex",
    summary: "The organization and location crumbs of the top bar. Each opens a searchable list; the location list ends with Manage locations.",
    source: ["components/ContextSwitcher.tsx", "styles/shell.css"],
    paper: { page: "Flowfokus Design — Program details", board: "Program" },
    examples: [{ file: "context-switcher", title: "Organization and location" }],
    props: [
      { name: "label", type: "string", note: 'What it chooses, such as "Location". Names the button and the list.' },
      { name: "current", type: "string", note: "The name on the button." },
      { name: "options", type: "SwitcherOption[]", note: "value, label, and an optional aside, detail, and icon." },
      { name: "footer", type: "(close) => ReactNode", note: "Actions under the list. Call close before leaving the page." },
      { name: "strong", type: "boolean", default: "false", note: "Ink text for the first crumb. Later crumbs are grey." },
    ],
  },
  {
    slug: "toast",
    name: "Toast",
    group: "Complex",
    summary: "Feedback after an action, at the bottom, with at most one action.",
    source: ["components/Toast.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Search palette and toasts" },
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
    slug: "list-table",
    name: "List table",
    group: "Data",
    summary:
      "Column labels on a clear 30px header with one hairline, then rows flush with the content edge: no band, no dividers. Sort, selection, groups, and load more. Footer: ListPager.",
    source: ["components/parts/ListTable.tsx", "lib/list-parts.ts", "styles/parts.css"],
    paper: { page: "Flowfokus Design — Members", board: "Members — few filters + Display open" },
    examples: [
      { file: "list-table-members", title: "Two-line rows with sort and footer", note: "Rows are 56px. The footer is ListPager. A row that opens a record puts one Link with class list-table__link in its first cell; the link covers the row." },
      { file: "list-table-selection", title: "Row selection", note: "Adjacent chosen rows merge into one band. Shift-click chooses a range. The bar is announced as you choose. A row that no bulk action covers is `unselectable`: it keeps the checkbox column and shows no box." },
      { file: "list-table-groups", title: "Collapsible groups", note: "One-line rows are 44px, for a detail page." },
      { file: "list-table-states", title: "States", note: "Default, hover, focus, selected, loading, and empty." },
      { file: "list-table-load-more", title: "Load more on scroll", note: "For a list inside a detail page." },
    ],
    props: [
      { name: "columns", type: "ListColumn[]", note: "id, label, width (a grid track), align, sortable, hideLabel." },
      { name: "sort / onSort", type: "SortState", note: "Sortable headers are buttons. Only the sorted header cell carries aria-sort." },
      { name: "selection", type: "{ chosen, total, onToggleAll }", note: "Adds a checkbox column. The header box shows none, some (mixed), or all." },
      { name: "density", type: '"two-line" | "one-line"', default: '"two-line"', note: "56px or 44px rows." },
      { name: "row: unselectable", type: "boolean", note: "In a table with a selection column: no checkbox on this row. Its width stays, so the columns line up." },
      { name: "row: onKeyDown / onContextMenu", type: "handlers", note: "Keys pressed in the row and a right-click on it, for a row shortcut and a row menu." },
    ],
  },
  {
    slug: "filter-bar",
    name: "Filter bar",
    group: "Data",
    summary:
      "A Filter button, then a chip per filter: field, operator, value, remove. A click on the operator flips is and is not (or is any of and is none of). Search sits on the right. With no fields, the Filter button is left out: the Members list does this until Rails has member filters.",
    source: ["components/parts/FilterBar.tsx", "lib/list-parts.ts", "styles/parts.css"],
    paper: { page: "Flowfokus Design — Members", board: "Members — filter operator (is / is not)" },
    examples: [
      { file: "filter-bar-basic", title: "Add, flip, change and remove", note: "Press / to search." },
      { file: "filter-bar-states", title: "States", note: "No filters; no fields (search and Display only); a chip at default, hover, and focus." },
    ],
    props: [
      { name: "fields", type: "FilterField[]", note: "key, label, icon, and options with an optional dot and count. An empty list leaves the Filter button out." },
      { name: "filters / onChange", type: "ActiveFilter[]", note: "{ field, values, negated }. The operator text comes from filterOperator." },
    ],
  },
  {
    slug: "display-popover",
    name: "Display popover",
    group: "Data",
    summary: "Sort by with a direction button, one toggle, column chips, and Reset to default. Traps focus; Escape closes it.",
    source: ["components/parts/FilterBar.tsx", "components/ui/popover.tsx"],
    paper: { page: "Flowfokus Design — Members", board: "Members — few filters + Display open" },
    examples: [{ file: "display-popover-basic", title: "Sort, toggle, columns and reset", note: "Reset does nothing while everything is at its default." }],
  },
  {
    slug: "status-marks",
    name: "Status marks",
    group: "Data",
    summary:
      "Rings and pies for Paid, Partly paid, Fulfilled, Renews, and Ends. A status always has a label beside it, in the words Rails returns.",
    source: ["components/parts/marks.tsx", "components/ui/icon.tsx"],
    paper: { page: "Flowfokus Design — Sale details", board: "Sale details — #1058 partly paid · Light" },
    examples: [{ file: "status-marks-states", title: "Payment, fulfillment and time" }],
    props: [
      { name: "kind", type: "StatusKind", note: "paid, partlyPaid, unpaid, fulfilled, partlyFulfilled, unfulfilled." },
      { name: "tone", type: '"good" | "warning" | "critical" | "neutral"', note: "Colours the mark. The label stays ink." },
      { name: "TimeMark fraction", type: "number", note: "0 to 1, how much of the period is left." },
    ],
  },
  {
    slug: "credit-ring",
    name: "Credit ring",
    group: "Data",
    summary: "The ring of a pass: 7 of 10 left. Amber at two or fewer left, and at none.",
    source: ["components/parts/marks.tsx", "lib/list-parts.ts"],
    paper: { page: "Flowfokus Design — Pass credits", board: "Pass credits — options" },
    examples: [{ file: "credit-ring-states", title: "Full, part used, low, and none" }],
  },
  {
    slug: "spot-stack",
    name: "Spot stack",
    group: "Data",
    summary:
      "Slanted segments, one per spot. Booked is ink, open is faint, full is amber, past is grey. Chart size and row size. A cancelled session is a flat faint line. A session with more spots than a stack can draw (16 in a column, 20 in a row) is drawn smaller: it never shows full unless it is, and never shows empty with a booking.",
    source: ["components/parts/marks.tsx", "lib/list-parts.ts"],
    paper: { page: "Flowfokus Design — Program details", board: "Program" },
    examples: [{ file: "spot-stack-sizes", title: "Chart size and row size" }],
  },
  {
    slug: "calendar-block",
    name: "Calendar block",
    group: "Blocks",
    summary:
      "One session on the Calendar. A class is a white card with its spot stack and a count, an appointment a flat grey block (Booked or Open), an event a dark one with its spots taken. Full is amber, an ended session is washed out, and a cancelled one is a dashed red outline with a struck name. With a link it opens the session page.",
    source: ["features/calendar/Block.tsx", "features/calendar/Calendar.tsx", "styles/calendar.css"],
    paper: { page: "Flowfokus Design — Calendar", board: "Calendar · K2 · Day, kinds" },
    examples: [{ file: "calendar-blocks", title: "Each kind and state", note: "Sample data." }],
  },
  {
    slug: "mix-bar",
    name: "Mix bar",
    group: "Data",
    summary: "A row of slanted stripes shaded by share. Put the numbers beside it as text.",
    source: ["components/parts/marks.tsx", "lib/list-parts.ts"],
    paper: { page: "Flowfokus Design — Program details", board: "Program" },
    examples: [{ file: "mix-bar-basic", title: "Ways to book" }],
  },
  {
    slug: "allowance-bar",
    name: "Allowance bar",
    group: "Data",
    summary:
      "What a benefit allows: one slanted segment for each visit or booking, or one solid slanted bar for unlimited. Past 20 the bar is solid too. Put the amount beside it as text. Product details uses it in Benefits.",
    source: ["components/parts/marks.tsx"],
    paper: { page: "Flowfokus Design — Product details", board: "Product" },
    examples: [{ file: "allowance-bar-basic", title: "Unlimited, counted, and past the limit" }],
    props: [
      { name: "limit", type: "number | null", note: "Visits or bookings. Null draws the solid bar." },
      { name: "label", type: "string", note: "The accessible name, such as \"10 bookings\"." },
    ],
  },
  {
    slug: "tag-chip",
    name: "Tag chip",
    group: "Data",
    summary: "A tag as a pill with a coloured dot. The name carries the meaning; the dot only marks it.",
    source: ["components/parts/marks.tsx"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Light" },
    examples: [{ file: "tag-chip-basic", title: "Tones" }],
  },
  {
    slug: "list-toolbar",
    name: "List toolbar",
    group: "Data",
    summary: "Filter and chips on the left, search on the right, above every list.",
    source: ["components/ListToolbar.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Data", board: "Table toolbar" },
    examples: [{ file: "list-toolbar-basic", title: "Filter, chips and search" }],
  },
  {
    slug: "list-pager",
    name: "List pager",
    group: "Data",
    summary: "The footer of a top-level list: the range and the page buttons.",
    source: ["components/ListPager.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Data", board: "Table" },
    examples: [{ file: "list-pager-basic", title: "Pages" }],
  },

  // Blocks
  {
    slug: "app-shell",
    name: "App shell",
    group: "Blocks",
    summary:
      "From 768px the app is a rounded window on a tinted frame. The sidebar lists the pages the role can read; the top bar holds the breadcrumb, Search, and the page actions.",
    source: ["routes/$org/route.tsx", "components/ui/sidebar.tsx", "lib/pages.ts", "styles/shell.css"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Dark" },
    examples: [{ file: "app-shell", title: "Window, sidebar and top bar", note: "Sample content. It shows from 768px; a phone gets the drawer and the tab bar." }],
    props: [
      { name: "pages", type: "readablePages(permissions)", note: "Calendar, Members, Sales, Programs, Products. A page the role cannot read has no item." },
      { name: "data-scroll-restoration-id", type: '"main"', note: "The main column scrolls inside the window, so the router restores it." },
    ],
  },
  {
    slug: "detail-layout",
    name: "Detail layout",
    group: "Blocks",
    summary:
      "A main column and a right panel. The panel holds label and value rows under Details, and groups such as Tags and Notes with a + button. Below 1100px the panel sits under the main column. The layout pads its own sides, so the main column drops its page padding and the layout fills the window.",
    source: ["components/parts/DetailLayout.tsx", "styles/parts.css"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Light" },
    examples: [{ file: "detail-layout-member", title: "Member page, with its background", note: "Sample data. A real page shows only what Rails returns." }],
    props: [
      { name: "record", type: "RecordKind", note: "member, sale, program, session, product: picks the background pattern." },
      { name: "panel", type: "ReactNode", note: "PanelGroup, PanelAddGroup, PanelRows. Leave a + out when the person cannot add." },
    ],
  },
  {
    slug: "detail-hero",
    name: "Detail hero",
    group: "Blocks",
    summary:
      "An avatar or icon tile, the title, one muted line, and up to two stats on the right. The display size is for a program or session. A stat with `above` puts its label over the figure: \"Starts in\" over \"20 min\". HeroStats is the same figures on their own: the Members list shows its count with it.",
    source: ["components/parts/DetailLayout.tsx"],
    paper: { page: "Flowfokus Design — Program details", board: "Program" },
    examples: [{ file: "detail-hero-variants", title: "Member, sale, program, and list title", note: "The last one is HeroStats beside a list title." }],
  },
  {
    slug: "activity",
    name: "Activity",
    group: "Blocks",
    summary:
      "A comment box, an All, Comments, Activity control, event rows with a dot, comment rows with an avatar, and Show N earlier events. Leave the comment box out when Rails cannot save comments.",
    source: ["components/parts/Activity.tsx", "components/ui/segmented-control.tsx", "lib/list-parts.ts"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Light" },
    examples: [{ file: "activity-states", title: "Feed, empty, and loading", note: "Comment with ⌘↵." }],
  },
  {
    slug: "record-section",
    name: "Record section",
    group: "Blocks",
    summary:
      "A section of a record page: a small grey title, an optional button (Record payment, Fulfill items) or View all on the right when the list has more rows, then flush list rows with no label row on screen (the list table keeps it for assistive technology with the list-table--bare class). Member details uses it for Holds, Recent sales, and Bookings; New member for Profile; Sale details for Items and Payments; New sale for Products and Payment; Product details for Prices and Benefits.",
    source: ["features/members/Section.tsx", "components/parts/ListTable.tsx", "styles/members.css"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Light" },
    examples: [{ file: "record-section", title: "Holds with View all, and an empty section", note: "Sample data." }],
    props: [
      { name: "title", type: "string", note: "Names the section. 12px, muted." },
      { name: "more", type: "{ open, onToggle } | null", note: "Shows View all (or Show fewer) and opens the rest in place. Leave it null when the list is short." },
      { name: "action", type: "ReactNode", note: "A compact secondary button for the whole section, on the right of the title. Show it only when the person can do it, and give it its letter with Kbd." },
    ],
  },
  {
    slug: "horizon",
    name: "Horizon",
    group: "Blocks",
    summary:
      "A line of the last week and the next 30 days. Today is a ringed dot, coming bookings are rings, earlier ones are small dots, and a membership or pass that ends is an amber ring. Labels sit above and below; one that would overlap is left out, and \"Show all N events\" lists every mark with its date.",
    source: ["features/members/Horizon.tsx", "features/members/timeline.ts", "styles/members.css"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Light" },
    examples: [{ file: "horizon-basic", title: "Bookings, and passes that end", note: "Sample data. A real page marks only bookings, periods, and rights that Rails returned." }],
    props: [
      { name: "horizon", type: "Horizon", note: "From horizonFor(member, productName, now, timezone): the window, one tick per calendar day, and the marks in time order. Show it only when it has a mark besides today." },
      { name: "timezone", type: "string", note: "The organization's time zone, for the day and time labels." },
    ],
  },
  {
    slug: "background-pattern",
    name: "Background pattern",
    group: "Blocks",
    summary:
      "One faint pattern per record type. Decoration only: hidden from assistive technology, no pointer events, and off under prefers-contrast: more.",
    source: ["components/parts/Backdrop.tsx", "styles/parts.css"],
    paper: { page: "Flowfokus Design — Session details", board: "Session · A3 · Chosen (clock ticks)" },
    examples: [{ file: "backdrop-patterns", title: "The five patterns", note: "Drawn at 70% of their size." }],
  },
  {
    slug: "page-head",
    name: "Page head",
    group: "Blocks",
    summary: "A page's title, record facts and actions. Actions move to the top bar on wider screens.",
    source: ["components/ui.tsx", "components/PageActions.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Page head and tabs" },
    examples: [{ file: "page-head-basic", title: "Title, meta and actions" }],
    props: [
      { name: "title", type: "string", note: "The page title." },
      { name: "meta", type: "ReactNode", note: "Record metadata, such as a date. Not a subtitle." },
      { name: "children", type: "ReactNode", note: "Facts beside the title, such as a status." },
      { name: "actions", type: "ReactNode", note: "Placed in the top bar from 768px. Compact buttons show their letter with Kbd." },
    ],
  },
  {
    slug: "settings-rows",
    name: "Settings page",
    group: "Blocks",
    summary:
      "A page inside the Settings dialog: a 30px title with at most one 32px secondary + button beside it, sections whose header keeps the only hairline, and rows of a title, one line of description, and one control (a value, a select, or a switch). Rows have no lines between them. A list page (Locations, Staff, Roles) has no section header; a table keeps a hairline under its column headings, 20px under the title. A change saves when it is made, with a toast.",
    source: ["features/settings/SettingsPage.tsx", "features/settings/SettingsDialog.tsx", "styles/settings.css"],
    paper: { page: "Flowfokus Design — Settings", board: "Settings D · Dialog — General" },
    examples: [{ file: "settings-rows", title: "Sections, rows, the title action, and the lock line", note: "Sample data." }],
    props: [
      { name: "SettingsPage title / action", type: "string / ReactNode", note: "action is a SettingsPageAction, only when the person can take it." },
      { name: "SettingsRow title / description", type: "string", note: "The description is one line. Pass htmlFor to name the control with the title." },
      { name: "LockLine", type: "ReactNode", note: "Says why this role sees the page but cannot change it." },
    ],
  },
  {
    slug: "sale-amount",
    name: "Sale amount",
    group: "Blocks",
    summary:
      "A sale's total, with the balance still due under it (amber for part paid, red for unpaid) or the amount refunded. A void sale shows its total struck through. The Sales list uses it.",
    source: ["features/sales/SaleFacts.tsx", "styles/sales.css"],
    paper: { page: "Flowfokus Design — Member details", board: "Member details — Priya Nair · Light" },
    examples: [{ file: "sale-amount-states", title: "Paid, part paid, refunded, and void", note: "Sample data." }],
    props: [{ name: "sale", type: "Sale", note: "Reads total_minor, balance_minor, refunded_minor, payment_status, voided_at, and currency." }],
  },
  {
    slug: "form-notice",
    name: "Form notice",
    group: "Blocks",
    summary: "A form's failed request in one line. The fields keep their values.",
    source: ["components/FormNotice.tsx"],
    paper: { page: "Flowfokus Redesign — Components — Complex", board: "Forms" },
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

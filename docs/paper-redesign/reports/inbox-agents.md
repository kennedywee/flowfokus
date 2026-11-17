# Inbox and Agents — Paper report

Pages: two new pages, "Inbox" (`p-W-0`) and "Agents" (`p-X-0`). They sit right after "Home" in the page list. No other page moved. I did not change any existing artboard.

Both screens are new. Each frame is a clone of the Paper window and top bar, and uses a clone of the final sidebar from "App — Sidebar with all pages" (`1IXF-0`). Inbox or Agents is selected in the sidebar, and Home loses the selected fill. The row, band, properties, comment-box, and error-row styles come from Home, Member details, and Sale details. Every frame has the "Sample data" mark beside the title.

Sample names reuse the file: Mei Ling Tan, Rachel Goh, Sara Lee, Kevin Ong, Aina Rahim. The facts match Home: #1041 has had RM 180.00 due for 12 days, Rachel Goh's membership ends in 4 days, and 4 sales have RM 640.00 due.

## 1. Coverage

### Inbox (`routes/$org/inbox.tsx`, `features/preview/Inbox.tsx`)

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| List of updates with unread dot, kind, time, title, name and detail | Inbox — Payment due open | added |
| Grouping | Every Inbox frame: "Today" and "Yesterday" bands | added (the app shows one list; Paper groups by day, like Schedule) |
| Filters: All, Unread (count), Payments, Memberships, Desk, Resolved | Every Inbox frame: tabs styled like the Activity filter | added |
| Open an item (marks it read, shows the detail pane) | Inbox — Payment due open | added |
| Payment needs a follow-up → sale | Inbox — Payment due open ("Open sale #1041") | added |
| Membership ends soon → member | Inbox — Membership ending open ("Open member") | added |
| Check-in was denied → sale to fulfill | Inbox — Denied check-in open ("Open sale #1055", Payment Paid, Fulfillment Unfulfilled) | added |
| Bank transfer recorded → sale | Inbox — Payment recorded open ("Open sale #1052") | added |
| Staff handover (no record) | Inbox — Staff note open (no record): Mark resolved only | added |
| Mark resolved | Every open-item frame | added |
| Resolved filter and Move back to inbox | Inbox — Resolved | added |
| Mark all read (top bar) | Every Inbox frame | added |
| Mark all read result: no dots, no unread count, button disabled | Inbox — All read (after Mark all read) | added |
| Nothing selected | Inbox — Nothing selected | added |
| Filter with no updates ("No updates in this view") | Inbox — Filter has no updates (Unread, "Show all") | added |
| Empty inbox | Inbox — Empty | added |
| Loading | Inbox — Loading | added (for real data) |
| Did not load | Inbox — Did not load | added (for real data) |
| Phone layout: list, then detail with "All updates" back button | — | not designed. Phone frames belong to the Narrow screens page. |
| Footnote "Preview updates. Actions reset…" and the detail note "This is a sample update…" | — | not designed. The "Sample data" mark says this once. |

### Agents (`routes/$org/agents.tsx`, `features/preview/Agents.tsx`)

| Real screen or state | Paper artboard | Status |
| --- | --- | --- |
| New conversation with suggested prompts | Agents — New conversation | added |
| New conversation (top bar) | Every Agents frame; disabled when the conversation is empty | added |
| Conversation with several turns | Agents — Conversation | added |
| Answer with a member list (name, last visit, balance) | Agents — Conversation (first answer, rows open the member) | added |
| Answer with links to records (Reports, sales with a balance due) | Agents — Conversation (second answer) | added |
| Assistant working | Agents — Assistant working | added (the app answers at once today) |
| Answer failed | Agents — Answer failed ("Try again") | added (the app cannot fail today) |
| Composer focused, text typed, Send enabled (Enter sends) | Agents — Composer focused (1px ink border, no ring) | added |
| Composer empty, Send disabled | Agents — New conversation, Conversation | added |
| Assistant aside: name, Preview pill, capabilities, "Nothing is sent or changed" | Every Agents frame: properties column "Assistant" and "Helps with" | added |
| Message draft answer ("This preview does not send messages") | — | not designed. It is a plain text answer; the Conversation frame shows the text style. |
| Confirm before the assistant acts | — | not designed. The app simulates no action, so there is nothing to confirm. |
| Phone layout | — | not designed. Phone frames belong to the Narrow screens page. |

## 2. Added

Inbox page (`p-W-0`):

- **Inbox — Payment due open.** Title with the inbox tile and "Sample data". Filter tabs. "Today" and "Yesterday" bands. 52px rows: a 28px tile with the kind mark, title, "name · fact", time, and a blue unread dot at the right. Unread titles are semibold; read titles are medium. The open row has the hover fill. A detail column (400px, one hairline on its left) shows the kind and time, the title, one paragraph, a "Record" properties group (Sale, Member, Balance due), then "Open sale #1041" and "Mark resolved". Mark all read is in the top bar.
- **Inbox — Membership ending open.** Rachel Goh. Record: Membership "Monthly unlimited · ends Sun 8 Nov", Member. Action: "Open member" (Renew lives in the member page's ⋯ menu).
- **Inbox — Denied check-in open.** Sara Lee, "Sale not fulfilled". Record: Sale #1055, Member, Payment Paid, Fulfillment Unfulfilled, as two facts. Action: "Open sale #1055".
- **Inbox — Payment recorded open.** Kevin Ong, RM 200.00 by bank transfer on #1052. Record shows Payment Paid and Fulfillment Unfulfilled. Action: "Open sale #1052".
- **Inbox — Staff note open (no record).** Aina Rahim's morning handover. "Written by" only, and Mark resolved. No open action, because nothing is linked.
- **Inbox — Nothing selected.** No row open, so all three Today items are unread (Unread 3). The detail column says "Select an update to read it."
- **Inbox — All read (after Mark all read).** No dots, no unread count, all titles medium, Mark all read disabled.
- **Inbox — Resolved.** Resolved tab. The resolved item with a green check, "Resolved · Payments · Today 09:12", and "Move back to inbox".
- **Inbox — Filter has no updates.** Unread tab, "No unread updates." and "Show all". Mark all read disabled.
- **Inbox — Empty.** "Nothing in your inbox." Mark all read disabled. No detail column.
- **Inbox — Loading.** Skeleton band and three skeleton rows. No dates, names, or counts. Mark all read disabled.
- **Inbox — Did not load.** The Home error row: "Updates did not load", "Check your connection, then try again.", and "Try again".

Agents page (`p-X-0`):

- **Agents — New conversation.** Title with the bot tile and "Sample data". A "Try asking" band and three prompt rows. A properties column: Assistant (Name, Reads "Sample records", Changes "Nothing") and Helps with (three checks). The composer is the Member details comment box: placeholder "Ask about your gym…" and a dark "Send ↵" button, disabled while empty. New conversation is disabled here.
- **Agents — Conversation.** Two turns. Staff messages: a "K" avatar, "Kennedy · 09:14", the question in medium weight. Assistant messages: a small bot tile, "Desk assistant · 09:14", the answer in regular weight. No bubbles and no color, except the warning-coloured amount. The first answer holds member rows (initials, name, last visit, balance, chevron). The second has links: "Open Reports" and "View 4 sales with a balance due".
- **Agents — Assistant working.** The last answer reads "Looking through this week's sales…" in grey with two skeleton lines.
- **Agents — Answer failed.** A red mark, "The answer did not load.", and "Try again".
- **Agents — Composer focused.** Typed text with a caret, a 1px ink border, no ring, and Send enabled.

## 3. Conflicts

None. These screens had no Paper frames before.

## 4. Needs app or Rails work

Inbox, to stop being sample data:

- A Rails model for inbox items, scoped to the current organization and location. Each item has a kind (payment due, payment recorded, membership ending, check-in denied, staff note), a time, a link to one record (sale, member, or check-in), and a short text.
- Read and resolved state per staff user: `GET /inbox?filter=`, `PATCH /inbox/:id` (read, resolved), and `POST /inbox/mark_all_read`. The unread count comes from Rails.
- Items made by existing events: a sale with a balance due for N days, a payment recorded, a membership ending within N days, a denied check-in, with its denial reason. Staff notes need a create endpoint and a form, which Paper does not design yet.
- Wording: the app says "Payment needs a follow-up" with a bank-transfer reference. Rails has no reference field, so Paper leaves it out.
- Grouping by day, the per-row record facts (sale number, payment and fulfillment facts), and the "Open sale / Open member" links.
- The app's footnote and sample note go; the "Sample data" mark stays until real data arrives.
- Loading and did-not-load states, with the staff-facing error text above, not an API message.

Agents, to stop being sample data:

- An assistant endpoint (`POST /agents/conversations/:id/messages`) that runs on the server with the staff member's permissions and the current organization. It must read only records that staff can read.
- Structured answers: text plus record lists (members, sales) and links, so the screen draws rows and not free text.
- Conversation storage, or a decision that conversations are not kept. "New conversation" clears the thread.
- A working state, a failed state with Try again, and a timeout.
- If the assistant ever changes data (record a payment, draft and send a message), a confirm step before it acts. Paper does not design it yet, because the app simulates no action.
- The properties column must then say what the assistant reads and changes, from Rails.

## 5. Open questions

- **Inbox in the sidebar now?** My view: yes, but only once one real feed exists. Home's "Needs attention" already covers balance due, unfulfilled sales, and memberships ending, from Rails. A sample-data inbox beside it shows staff two lists of the same work, and one of them is fake. Until Rails sends items, I would hide Inbox from the sidebar or keep it behind the preview flag. Decide whether Inbox replaces "Needs attention" or adds per-item read and resolve to it.
- **Agents in the sidebar now?** My view: no, not while it runs on prepared replies. A top-level item with canned answers sets a wrong expectation about what it can see. Keep it behind the preview flag, or reach it from ⌘K, until a real endpoint exists.
- Should the Inbox detail be a column (as drawn) or expand in place, like rows on Member details? The column suits a desk screen that works through items one by one.
- Should "Mark resolved" exist, or should an item resolve itself when its fact changes (the payment is recorded, the sale is fulfilled)? Self-resolving items would remove a manual step.
- Who sees which kinds? For example, should a role without `purchases:*` see payment items?
- Agents: may the assistant ever act, and if so which actions? This decides whether a confirm design is needed.

## 6. Not verified

- I did not open the running app. I read the code only, as the brief says.
- Phone layouts for both screens are not designed.
- The Inbox detail column is 400px. On a 1280px window the list keeps about 560px. I did not draw a narrower desktop.
- Dark theme frames are not drawn.
- `bun run design:check` does not apply. I changed no code.

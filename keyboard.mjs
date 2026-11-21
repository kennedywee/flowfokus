// Keyboard and screen reader checks for the shared parts, driven in the gallery.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, renameSync, readdirSync } from "node:fs";
const dir = ".artifacts/verify-flowfokus/runs/shared-parts-87/keyboard";
mkdirSync(dir, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "passed" : "FAILED"}  ${name}${detail ? " — " + detail : ""}`);
};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir, size: { width: 1280, height: 900 } } });
const page = await ctx.newPage();
const go = async (slug) => {
  await page.goto(`http://localhost:4001/components/${slug}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
};
const focused = () => page.evaluate(() => { const e = document.activeElement; return e ? (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 60) : ""; });
const snap = async (loc) => (await loc.ariaSnapshot());
const aria = [];

// ---- List table: sort ----
await go("list-table");
const table1 = page.getByRole("table", { name: "Members (sample data)", exact: true });
const nameHeader = table1.getByRole("columnheader", { name: "Member", exact: true });
check("sortable header cell has aria-sort=ascending", (await nameHeader.getAttribute("aria-sort")) === "ascending");
const sortBtn = nameHeader.getByRole("button");
await sortBtn.focus();
await page.waitForTimeout(500);
await page.keyboard.press("Enter");
check("Enter on the sort button flips to descending", (await nameHeader.getAttribute("aria-sort")) === "descending");
const firstRowName = await table1.getByRole("row").nth(1).innerText();
check("rows reorder after sort", firstRowName.includes("Kumar") || firstRowName.includes("Kuma"), firstRowName.split("\n")[0]);
check("non-sortable header has no button", (await table1.getByRole("columnheader", { name: "Plan", exact: true }).getByRole("button").count()) === 0);
aria.push("# List table (members)\n" + (await snap(table1.getByRole("row").first())));

// ---- Selection ----
const sel = page.getByRole("table", { name: "Bookings (sample data)", exact: true });
await sel.scrollIntoViewIfNeeded();
const live = sel.locator("xpath=..").locator('p[role="status"].visually-hidden');
check("live region announces the starting selection", (await live.innerText()) === "2 selected", await live.innerText());
const headBox = sel.getByRole("checkbox", { name: "Choose all rows" });
check("header checkbox is mixed with some rows chosen", (await headBox.getAttribute("aria-checked")) === "mixed", await headBox.getAttribute("aria-checked"));
const jason = sel.getByRole("checkbox", { name: "Choose Jason Teo" });
await jason.focus();
await page.keyboard.press("Space");
check("Space chooses a row and the live region says 3 selected", (await live.innerText()) === "3 selected", await live.innerText());
const bands = await sel.locator('[role="row"][data-band]').evaluateAll((rows) => rows.map((row) => row.getAttribute("data-band")));
check("three adjacent chosen rows merge into one band (first, middle, last)", JSON.stringify(bands) === JSON.stringify(["first", "middle", "last"]), JSON.stringify(bands));
await headBox.focus();
await page.keyboard.press("Space"); // all
await page.keyboard.press("Space"); // none
await sel.getByRole("checkbox", { name: "Choose Priya Nair" }).click();
await sel.getByRole("checkbox", { name: "Choose Nurul Huda" }).click({ modifiers: ["Shift"] });
const afterShift = await live.innerText();
check("shift-click chooses the whole range between two rows", afterShift === "6 selected" && (await sel.locator('[data-selected]').count()) === 6, afterShift);
const bar = page.getByRole("toolbar", { name: "Bulk actions" });
check("floating bar is a named toolbar with bulk actions", (await bar.getByRole("button", { name: "Check in" }).count()) === 1 && (await bar.getByRole("button", { name: "No-show" }).count()) === 1);
aria.push("# Floating bar\n" + (await snap(bar)));
await bar.getByRole("button", { name: "Check in" }).focus();
await page.keyboard.press("Escape");
check("Escape in the bar clears the selection", (await bar.count()) === 0 && (await live.innerText()) === "", `live="${await live.innerText()}"`);
await headBox.focus();
await page.keyboard.press("Space");
check("header checkbox chooses all rows", (await live.innerText()) === "7 selected", await live.innerText());
await page.keyboard.press("Space");
check("and clears them", (await live.innerText()) === "");

// ---- Groups ----
const trigger = page.getByRole("button", { name: /Cancelled/ });
await trigger.scrollIntoViewIfNeeded();
const before = await trigger.getAttribute("aria-expanded");
await trigger.focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
check("Enter toggles a group (aria-expanded flips)", before !== (await trigger.getAttribute("aria-expanded")), `${before} → ${await trigger.getAttribute("aria-expanded")}`);
aria.push("# Groups\n" + (await snap(page.getByRole("table", { name: "Bookings by arrival (sample data)", exact: true }))));

// ---- Load more ----
const more = page.getByRole("button", { name: "Show more" });
await more.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const rowsNow = await page.getByRole("table", { name: "Recent bookings (sample data)", exact: true }).getByRole("row").count();
check("load more adds rows when the sentinel scrolls into view", rowsNow > 4, `${rowsNow} rows`);

// ---- Filter bar ----
await go("filter-bar");
const bar2 = page.getByRole("group", { name: "Filters" }).first();
const statusChip = bar2.getByRole("group", { name: /^Status is/ });
const op = statusChip.getByRole("button", { name: /^Status is\./ });
await op.focus();
await page.keyboard.press("Enter");
check("Enter on the operator flips is → is not", (await bar2.getByRole("button", { name: /^Status is not\./ }).count()) === 1);
await page.keyboard.press("Enter");
check("and back to is", (await bar2.getByRole("button", { name: /^Status is\./ }).count()) === 1);
await bar2.getByRole("group", { name: /^Tag is not/ }).getByRole("button", { name: /^Tag is not\./ }).click();
check("the Tag chip flips is not → is by click", (await bar2.getByRole("group", { name: /^Tag is Staff/ }).count()) === 1);
// open the values menu, tick a second value: operator becomes "is any of"
await statusChip.getByRole("button", { name: /values/ }).click();
await page.getByRole("menuitemcheckbox", { name: "Frozen" }).click();
await page.keyboard.press("Escape");
check("a second value turns the operator into 'is any of'", (await bar2.getByRole("button", { name: /^Status is any of\./ }).count()) === 1);
const remove = bar2.getByRole("button", { name: "Remove the status filter" });
await remove.focus();
await page.keyboard.press("Enter");
check("Enter on remove deletes the chip", (await bar2.getByRole("group", { name: /^Status/ }).count()) === 0);
await page.keyboard.press("/");
check("'/' focuses search", (await page.evaluate(() => document.activeElement?.getAttribute("type"))) === "search");
aria.push("# Filter bar\n" + (await snap(bar2)));

// ---- Display popover ----
await go("display-popover");
const display = page.getByRole("button", { name: "Display" });
await display.focus();
await page.keyboard.press("Enter");
const dialog = page.getByRole("dialog", { name: "Display" });
await dialog.waitFor();
check("Display opens a dialog named Display", true);
const insideFocus = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
check("focus moves into the popover", insideFocus, await focused());
let trapped = true;
for (let i = 0; i < 14; i++) {
  await page.keyboard.press("Tab");
  if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) { trapped = false; break; }
}
check("Tab x14 keeps focus inside (trap)", trapped);
const chip = dialog.getByRole("button", { name: "Email" });
await chip.focus();
await page.keyboard.press("Space");
check("column chip toggles aria-pressed with Space", (await chip.getAttribute("aria-pressed")) === "true");
const reset = dialog.getByRole("button", { name: "Reset to default" });
check("Reset to default enables after a change", await reset.isEnabled());
aria.push("# Display popover\n" + (await snap(dialog)));
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check("Escape closes it", (await dialog.count()) === 0 || !(await dialog.isVisible()));
check("focus returns to the Display button", (await focused()) === "Display", await focused());

// ---- Segmented control ----
await go("segmented-control");
const seg = page.getByRole("radiogroup", { name: "Show" });
const all = seg.getByRole("radio", { name: "All" });
await all.focus();
await page.keyboard.press("ArrowRight");
check("ArrowRight moves the segmented control to Comments", (await seg.getByRole("radio", { name: "Comments" }).getAttribute("aria-checked")) === "true");
aria.push("# Segmented control\n" + (await snap(seg)));

// ---- Backdrop ----
await go("background-pattern");
const hidden = await page.locator(".backdrop").evaluateAll((nodes) => nodes.every((n) => n.getAttribute("aria-hidden") === "true" && getComputedStyle(n).pointerEvents === "none"));
check("background patterns are aria-hidden and take no pointer events", hidden);
await page.emulateMedia({ contrast: "more" });
const off = await page.locator(".backdrop").first().evaluate((n) => getComputedStyle(n).display);
check("background patterns turn off under prefers-contrast: more", off === "none", off);

writeFileSync(`${dir}/aria-snapshots.md`, aria.join("\n\n") + "\n");
writeFileSync(`${dir}/assertions.md`, results.map((r) => `- ${r.ok ? "passed" : "failed"}: ${r.name}${r.detail ? " (" + r.detail + ")" : ""}`).join("\n") + "\n");
await ctx.close();
const vid = readdirSync(dir).find((f) => f.endsWith(".webm"));
if (vid) renameSync(`${dir}/${vid}`, `${dir}/keyboard-and-screen-reader.webm`);
await browser.close();
process.exit(results.some((r) => !r.ok) ? 1 : 0);

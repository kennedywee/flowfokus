// Proof for features/members.md: staff create a member in the portal.
// Copy this file as the start of a proof for another feature: keep signIn,
// shot, assert, and sql, and replace the steps.
//
// Run from the repository root (the runner keeps the working directory):
//   .agents/skills/verify-flowfokus/scripts/run-playwright \
//     .agents/skills/verify-flowfokus/scripts/proof-create-member.mjs
//
// Writes screenshots, a video, assertions.md, db.txt, and capture.mjs to
// .artifacts/verify-flowfokus/runs/<timestamp>-create-member/
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

const PORTAL = "http://localhost:4001";
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-");
const OUT = process.env.OUT || `.artifacts/verify-flowfokus/runs/${stamp}-create-member`;
mkdirSync(OUT, { recursive: true });
copyFileSync(new URL(import.meta.url), `${OUT}/capture.mjs`); // Keep the script beside its output.
const run = stamp.slice(-6);
const NAME = `Proof Member ${run}`;
const EMAIL = `proof.${run}@example.com`;

let shotNo = 0;
const results = [];
const shot = (page, name) => page.screenshot({ path: `${OUT}/${String(++shotNo).padStart(2, "0")}-${name}.png`, fullPage: true });
async function assert(name, fn) {
  try { await fn(); results.push(`- passed: ${name}`); }
  catch (error) { results.push(`- failed: ${name} (${error.message.split("\n")[0]})`); throw error; }
}
// Read-only view of stored rows. psql runs inside the db container.
const sql = (query) => execFileSync("docker", ["exec", "flowfokus-db", "psql", "-U", "flowfokus",
  "-d", "flowfokus_development", "-Atc", query], { encoding: "utf8" }).trim();

// Signs in through the real portal and WorkOS Emulate pages.
async function signIn(page, email = "demo.owner@flowfokus.test") {
  await page.goto(`${PORTAL}/`);
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("local-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(`${PORTAL}/chainsaw`);
  await page.waitForLoadState("networkidle"); // Wait for hydration before typing.
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: OUT } });
const page = await context.newPage();
try {
  const before = sql(`select count(*) from members m join organizations o on o.id = m.organization_id where o.slug = 'chainsaw'`);

  await assert("demo.owner signs in and lands on /chainsaw", async () => {
    await signIn(page);
    await page.getByRole("heading", { name: "Today", level: 1 }).waitFor();
  });
  await shot(page, "signed-in-home");

  await assert("New member on /chainsaw/members opens /chainsaw/members/new", async () => {
    await page.getByRole("navigation", { name: "Staff pages" }).getByRole("link", { name: "Members" }).click();
    await page.getByRole("heading", { name: "Members", level: 1 }).waitFor();
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "New member" }).click();
    await page.waitForURL(`${PORTAL}/chainsaw/members/new`);
    await page.getByRole("heading", { name: "New member", level: 1 }).waitFor();
  });

  await assert("an empty form is refused and the URL stays", async () => {
    await page.getByRole("button", { name: /^Create member/ }).click();
    await page.getByRole("alert").filter({ hasText: "The member was not created" }).waitFor();
    if (!page.url().endsWith("/members/new")) throw new Error(`URL changed to ${page.url()}`);
  });
  await shot(page, "empty-form-refused");

  await assert("a valid member saves and opens the member page", async () => {
    await page.getByRole("textbox", { name: "Full name" }).fill(NAME);
    await page.getByRole("textbox", { name: "Email" }).fill(EMAIL);
    await shot(page, "form-filled");
    await page.getByRole("button", { name: /^Create member/ }).click();
    await page.waitForURL(/\/chainsaw\/members\/[0-9a-f-]{36}$/);
    await page.getByRole("heading", { name: NAME, level: 1 }).waitFor();
  });
  await shot(page, "member-page");

  await assert("the members list shows the new member", async () => {
    await page.goto(`${PORTAL}/chainsaw/members`);
    await page.getByRole("region", { name: "Members" }).getByRole("link", { name: new RegExp(NAME) }).waitFor();
  });
  await shot(page, "members-list");

  await assert("exactly one row is stored in Chainsaw Gym", async () => {
    const rows = sql(`select m.name, m.email, o.slug from members m join organizations o on o.id = m.organization_id where m.email = '${EMAIL}'`);
    const after = sql(`select count(*) from members m join organizations o on o.id = m.organization_id where o.slug = 'chainsaw'`);
    writeFileSync(`${OUT}/db.txt`, `members in chainsaw before: ${before}\nmembers in chainsaw after: ${after}\nrow: ${rows}\n`);
    if (rows !== `${NAME}|${EMAIL}|chainsaw`) throw new Error(`stored row is '${rows}'`);
    if (Number(after) !== Number(before) + 1) throw new Error(`count went ${before} -> ${after}`);
  });
} finally {
  await context.close(); // Finalizes the video, even after a failure.
  await browser.close();
  writeFileSync(`${OUT}/assertions.md`, `# Create a member\n\nCommit: ${execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()}\nMember: ${NAME} <${EMAIL}>\n\n${results.join("\n")}\n`);
  console.log(`Evidence: ${OUT}`);
  console.log(results.join("\n"));
}

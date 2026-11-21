// Proof for issue #98: a Developer sets gym_site Off, Labs, and On for Chainsaw,
// and the gym site and Settings follow each state. An Owner turns the Labs
// feature on and off, cannot reach Developer features, and cannot grant Developer.
// Recipe: features/feature-flags.md. Start with gym_site On for Chainsaw (the seed).
//   .agents/skills/verify-flowfokus/scripts/run-playwright \
//     .agents/skills/verify-flowfokus/scripts/proof-feature-flags.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

const PORTAL = "http://localhost:4001";
const SITE = "http://chainsaw.localhost:4002/";
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-");
const OUT = process.env.OUT || `.artifacts/verify-flowfokus/runs/${stamp}-feature-flags`;
mkdirSync(OUT, { recursive: true });
copyFileSync(new URL(import.meta.url), `${OUT}/capture.mjs`);

let shotNo = 0;
const results = [];
const db = [];
const shot = (page, name) => page.screenshot({ path: `${OUT}/${String(++shotNo).padStart(2, "0")}-${name}.png` });
async function assert(name, fn) {
  try { await fn(); results.push(`- passed: ${name}`); }
  catch (error) { results.push(`- failed: ${name} (${error.message.split("\n")[0]})`); throw error; }
}
const sql = (query) => execFileSync("docker", ["exec", "flowfokus-db", "psql", "-U", "flowfokus",
  "-d", "flowfokus_development", "-Atc", query], { encoding: "utf8" }).trim();
const flagRow = () => sql(`select f.state || ' enabled=' || f.enabled from features f join organizations o on o.id = f.organization_id where o.slug = 'chainsaw' and f.key = 'gym_site'`);
const record = (label) => db.push(`${label}: ${flagRow()}`);

async function signIn(page, email) {
  await page.goto(`${PORTAL}/`);
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("123123qwe");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(`${PORTAL}/chainsaw/calendar`);
  await page.waitForLoadState("networkidle");
}

const dialog = (page) => page.getByRole("dialog", { name: "Settings" });
const nav = (page) => dialog(page).getByRole("navigation", { name: "Settings pages" });
async function openSettings(page, slug) {
  await page.goto(`${PORTAL}/chainsaw/calendar?settings=${slug}`);
  await page.waitForLoadState("networkidle");
  await dialog(page).waitFor();
}
async function navLinks(page) {
  return (await nav(page).getByRole("link").allTextContents()).map((text) => text.trim());
}
async function expectNav(page, has, lacks) {
  const links = await navLinks(page);
  for (const name of has) if (!links.includes(name)) throw new Error(`nav lacks ${name}: ${links.join(", ")}`);
  for (const name of lacks) if (links.includes(name)) throw new Error(`nav has ${name}: ${links.join(", ")}`);
}
async function expectSite(site, open, name) {
  await site.goto(SITE);
  await site.waitForLoadState("networkidle");
  const heading = open ? "Chainsaw" : "No gym at this address";
  await site.getByRole("heading", { name: heading, level: 1 }).waitFor({ timeout: 10_000 });
  await shot(site, name);
}
async function setState(page, label) {
  await dialog(page).getByRole("radio", { name: label }).click();
  await page.getByRole("region", { name: /Notifications/ }).getByText(`Gym site · ${label}`, { exact: true }).waitFor();
  await page.waitForLoadState("networkidle");
}

const browser = await chromium.launch();
const devContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: OUT } });
const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: OUT } });
const siteContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const dev = await devContext.newPage();
const owner = await ownerContext.newPage();
const site = await siteContext.newPage();
try {
  record("before");
  await assert("Precondition: Chainsaw gym site is open with gym_site On", () => expectSite(site, true, "site-on-before"));

  await assert("Dana (Developer) sees Developer › Features with the WorkOS ID", async () => {
    await signIn(dev, "dana@flowfokus.com");
    await openSettings(dev, "features");
    await dialog(dev).getByRole("heading", { name: "Features", level: 2 }).waitFor();
    await dialog(dev).getByText("org_chainsaw", { exact: true }).waitFor();
    await dialog(dev).getByRole("radio", { name: "On" }).and(dev.locator("[aria-checked=true], [data-checked]")).first().waitFor();
    await expectNav(dev, ["Gym site", "Features"], ["Labs"]);
  });
  await shot(dev, "developer-features-on");

  await assert("Off: the gym site shows No gym at this address", async () => {
    await setState(dev, "Off");
    record("after Off");
    await expectSite(site, false, "site-off-not-found");
  });
  await assert("Off: Settings hides Gym site; its address opens General", async () => {
    await expectNav(dev, ["Features"], ["Gym site", "Labs"]);
    await shot(dev, "developer-features-off");
    await openSettings(dev, "gym-site");
    await dialog(dev).getByRole("heading", { name: "General", level: 2 }).waitFor();
  });
  await shot(dev, "gym-site-address-opens-general");

  await assert("Labs: the site stays hidden and Settings lists Labs", async () => {
    await openSettings(dev, "features");
    await setState(dev, "Labs");
    record("after Labs");
    await expectSite(site, false, "site-labs-not-found");
    await expectNav(dev, ["Labs", "Features"], ["Gym site"]);
  });
  await shot(dev, "developer-features-labs");

  await assert("Owner sees Labs with Beta and no Developer group", async () => {
    await signIn(owner, "kennedy@flowfokus.com");
    await openSettings(owner, "labs");
    await dialog(owner).getByRole("heading", { name: "Labs", level: 2 }).waitFor();
    await dialog(owner).getByText("Beta", { exact: true }).waitFor();
    await expectNav(owner, ["Labs"], ["Features", "Gym site"]);
    const groups = await nav(owner).locator(".settings-dialog__group-label").allTextContents();
    if (groups.includes("Developer")) throw new Error(`groups: ${groups}`);
  });
  await shot(owner, "owner-labs-off");

  await assert("Owner turns Gym site on in Labs: the site opens, Gym site returns", async () => {
    await dialog(owner).getByRole("switch", { name: "Gym site" }).click();
    await owner.getByRole("region", { name: /Notifications/ }).getByText("Gym site turned on", { exact: true }).waitFor();
    await owner.waitForLoadState("networkidle");
    record("after Owner turns Labs on");
    await expectSite(site, true, "site-labs-on-open");
    await expectNav(owner, ["Labs", "Gym site"], ["Features"]);
  });
  await shot(owner, "owner-labs-on");

  await assert("Owner turns it off again: the site shows No gym at this address", async () => {
    await dialog(owner).getByRole("switch", { name: "Gym site" }).click();
    await owner.getByRole("region", { name: /Notifications/ }).getByText("Gym site turned off", { exact: true }).waitFor();
    await owner.waitForLoadState("networkidle");
    record("after Owner turns Labs off");
    await expectSite(site, false, "site-labs-off-not-found");
    await expectNav(owner, ["Labs"], ["Gym site"]);
  });

  await assert("Owner cannot reach Developer features: the address opens General", async () => {
    await openSettings(owner, "features");
    await dialog(owner).getByRole("heading", { name: "General", level: 2 }).waitFor();
    await expectNav(owner, [], ["Features"]);
  });
  await shot(owner, "owner-features-address-opens-general");

  await assert("Owner cannot grant Developer: Invite staff offers no Developer role", async () => {
    await openSettings(owner, "staff");
    await dialog(owner).getByRole("button", { name: "Invite staff" }).click();
    const roles = owner.getByRole("group", { name: "Role" }).getByRole("radio");
    await roles.first().waitFor();
    const names = await roles.evaluateAll((inputs) => inputs.map((input) => input.labels?.[0]?.textContent?.trim() ?? ""));
    if (names.some((name) => /Developer/.test(name))) throw new Error(`roles: ${names}`);
    if (!names.some((name) => /Manager/.test(name))) throw new Error(`roles: ${names}`);
  });
  await shot(owner, "owner-invite-no-developer");

  await assert("On: the site opens, Gym site shows, Labs leaves the list", async () => {
    await openSettings(dev, "features");
    await setState(dev, "On");
    record("after On");
    await expectSite(site, true, "site-on-after");
    await expectNav(dev, ["Gym site", "Features"], ["Labs"]);
  });
  await shot(dev, "developer-features-on-again");
} finally {
  await devContext.close();
  await ownerContext.close();
  await siteContext.close();
  await browser.close();
  writeFileSync(`${OUT}/db.txt`, `${db.join("\n")}\n`);
  writeFileSync(`${OUT}/assertions.md`, `# Feature flags (#98)\n\nCommit: ${execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()}\n\n${results.join("\n")}\n`);
  console.log(`Evidence: ${OUT}`);
  console.log(results.join("\n"));
}

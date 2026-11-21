// usage: gallery-shots.mjs <before|after> <slug,slug,...>  ("index" = gallery index)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [, , label, slugList] = process.argv;
const out = `.artifacts/verify-flowfokus/runs/shared-parts-87/${label}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage();
  for (const slug of slugList.split(",")) {
    const url = slug === "index" ? "http://localhost:4001/components" : `http://localhost:4001/components/${slug}`;
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${slug}-${scheme}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();

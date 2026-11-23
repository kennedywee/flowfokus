import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import config from "./vite.config";

const { exports } = createRequire(import.meta.url)("@ui-sdk/react/package.json") as { exports: Record<string, unknown> };
const entries = Object.keys(exports)
  .filter((path) => path !== "./package.json")
  .map((path) => `@ui-sdk/react/${path.slice(2)}`);

// A ui-sdk entry Vite finds mid-run breaks SSR until a restart (issue #71).
describe("vite dev pre-bundles every @ui-sdk/react entry", () => {
  const resolved = typeof config === "function" ? config({ command: "serve", mode: "development" }) : config;

  test("in the browser", () => {
    expect(resolved.optimizeDeps?.include).toEqual(expect.arrayContaining(entries));
  });

  test("in the SSR Worker", () => {
    expect(resolved.environments?.ssr?.optimizeDeps?.include).toEqual(expect.arrayContaining(entries));
  });
});

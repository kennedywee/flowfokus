import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GALLERY, GALLERY_GROUPS, findEntry, groupedEntries } from "./registry";

const SRC = join(import.meta.dir, "../..");
const EXAMPLES = join(import.meta.dir, "examples");

/** Parts of the app shell. The gallery's own frame shows them in use. */
const SHELL_ONLY = new Set(["components/ui/sidebar.tsx"]);

describe("component gallery registry", () => {
  test("slugs are unique and URL-safe", () => {
    const slugs = GALLERY.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test("every example names a file, and every file is used once", () => {
    const named = GALLERY.flatMap((entry) => entry.examples.map((example) => example.file));
    expect(new Set(named).size).toBe(named.length);
    const files = readdirSync(EXAMPLES).map((file) => file.replace(/\.tsx$/, ""));
    expect([...named].sort()).toEqual([...files].sort());
  });

  test("every entry has an example and existing source files", () => {
    for (const entry of GALLERY) {
      expect(entry.examples.length).toBeGreaterThan(0);
      for (const file of entry.source) expect(existsSync(join(SRC, file))).toBe(true);
    }
  });

  test("every components/ui file has a page", () => {
    const covered = new Set(GALLERY.flatMap((entry) => entry.source));
    const missing = readdirSync(join(SRC, "components/ui"))
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => `components/ui/${file}`)
      .filter((file) => !covered.has(file) && !SHELL_ONLY.has(file));
    expect(missing).toEqual([]);
  });

  test("groups keep the registry order and lose nothing", () => {
    const grouped = groupedEntries();
    expect(grouped.map((group) => group.group)).toEqual([...GALLERY_GROUPS]);
    expect(grouped.flatMap((group) => group.entries)).toHaveLength(GALLERY.length);
  });

  test("findEntry returns an entry by slug, or nothing", () => {
    expect(findEntry("button")?.name).toBe("Button");
    expect(findEntry("nope")).toBeUndefined();
  });
});

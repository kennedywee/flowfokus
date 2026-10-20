import { describe, expect, test } from "bun:test";
import { initials } from "./ui";

describe("initials", () => {
  test.each([
    ["Ada Lovelace", "AL"],
    ["ada", "A"],
    ["Mary Ann Smith", "MS"],
    ["Flow Paid 15511", "FP"],
    ["Flow None 99802", "FN"],
    ["  ", "?"],
    ["15511", "1"],
    ["Éloïse Ñandú", "ÉÑ"],
  ])("%s gives %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

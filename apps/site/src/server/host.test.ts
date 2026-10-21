import { describe, expect, test } from "bun:test";
import { normalizeHost, parseBaseDomains, resolveSiteHost } from "./host";

const production = { baseDomains: ["flowfokus.com"], allowLocalhost: false };
const development = { baseDomains: ["flowfokus.com"], allowLocalhost: true };

describe("resolveSiteHost", () => {
  test.each([
    ["chainsaw.flowfokus.com", "chainsaw"],
    ["Chainsaw.Flowfokus.com", "chainsaw"],
    ["chainsaw.flowfokus.com.", "chainsaw"],
    ["iron-works.flowfokus.com:443", "iron-works"],
  ])("production %s → gym %s", (host, slug) => {
    expect(resolveSiteHost(host, production)).toEqual({ kind: "gym", slug });
  });

  test("development accepts <slug>.localhost with a port", () => {
    expect(resolveSiteHost("chainsaw.localhost:4002", development)).toEqual({ kind: "gym", slug: "chainsaw" });
  });

  test("production rejects localhost hosts", () => {
    expect(resolveSiteHost("chainsaw.localhost:4002", production)).toEqual({ kind: "rejected", reason: "unknown_domain" });
    expect(resolveSiteHost("localhost:4002", production)).toEqual({ kind: "rejected", reason: "unknown_domain" });
  });

  test("plain localhost in development shows setup, never a default gym", () => {
    expect(resolveSiteHost("localhost:4002", development)).toEqual({ kind: "setup" });
  });

  test.each(["portal", "api", "www", "admin", "auth", "login", "staff"])("reserved %s is rejected", (slug) => {
    expect(resolveSiteHost(`${slug}.flowfokus.com`, production)).toEqual({ kind: "rejected", reason: "reserved" });
    expect(resolveSiteHost(`${slug}.localhost:4002`, development)).toEqual({ kind: "rejected", reason: "reserved" });
  });

  test.each([
    ["flowfokus.com", "unknown_domain"],
    ["chainsaw.example.com", "unknown_domain"],
    ["chainsaw.flowfokus.com.evil.com", "unknown_domain"],
    ["evilflowfokus.com", "unknown_domain"],
    ["127.0.0.1:4002", "unknown_domain"],
    ["a.b.flowfokus.com", "malformed"],
    ["-chainsaw.flowfokus.com", "malformed"],
    ["chain_saw.flowfokus.com", "malformed"],
    ["chainsaw..flowfokus.com", "malformed"],
    ["[::1]:4002", "malformed"],
    ["chainsaw.flowfokus.com:99999x", "malformed"],
    ["", "malformed"],
  ])("%s is rejected as %s", (host, reason) => {
    expect(resolveSiteHost(host, development)).toEqual({ kind: "rejected", reason } as never);
  });

  test("a missing host is rejected", () => {
    expect(resolveSiteHost(undefined, development)).toEqual({ kind: "rejected", reason: "malformed" });
  });
});

describe("helpers", () => {
  test("normalizeHost strips port and case", () => {
    expect(normalizeHost("Chainsaw.Localhost:4002")).toBe("chainsaw.localhost");
    expect(normalizeHost("bad host")).toBeNull();
  });

  test("parseBaseDomains reads a list and has a safe default", () => {
    expect(parseBaseDomains(undefined)).toEqual(["flowfokus.com"]);
    expect(parseBaseDomains("flowfokus.com, Example.org")).toEqual(["flowfokus.com", "example.org"]);
    expect(parseBaseDomains(" , ")).toEqual(["flowfokus.com"]);
  });
});

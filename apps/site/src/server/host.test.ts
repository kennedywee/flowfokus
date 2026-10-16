import { describe, expect, test } from "bun:test";
import { normalizeHost, parseBaseDomains, resolveSiteHost } from "./host";

const production = { baseDomains: ["hydraflow.com"], allowLocalhost: false };
const development = { baseDomains: ["hydraflow.com"], allowLocalhost: true };

describe("resolveSiteHost", () => {
  test.each([
    ["chainsaw.hydraflow.com", "chainsaw"],
    ["Chainsaw.Hydraflow.com", "chainsaw"],
    ["chainsaw.hydraflow.com.", "chainsaw"],
    ["iron-works.hydraflow.com:443", "iron-works"],
  ])("production %s → gym %s", (host, slug) => {
    expect(resolveSiteHost(host, production)).toEqual({ kind: "gym", slug });
  });

  test("development accepts <slug>.localhost with a port", () => {
    expect(resolveSiteHost("chainsaw.localhost:3002", development)).toEqual({ kind: "gym", slug: "chainsaw" });
  });

  test("production rejects localhost hosts", () => {
    expect(resolveSiteHost("chainsaw.localhost:3002", production)).toEqual({ kind: "rejected", reason: "unknown_domain" });
    expect(resolveSiteHost("localhost:3002", production)).toEqual({ kind: "rejected", reason: "unknown_domain" });
  });

  test("plain localhost in development shows setup, never a default gym", () => {
    expect(resolveSiteHost("localhost:3002", development)).toEqual({ kind: "setup" });
  });

  test.each(["portal", "api", "www", "admin", "auth", "login", "staff"])("reserved %s is rejected", (slug) => {
    expect(resolveSiteHost(`${slug}.hydraflow.com`, production)).toEqual({ kind: "rejected", reason: "reserved" });
    expect(resolveSiteHost(`${slug}.localhost:3002`, development)).toEqual({ kind: "rejected", reason: "reserved" });
  });

  test.each([
    ["hydraflow.com", "unknown_domain"],
    ["chainsaw.example.com", "unknown_domain"],
    ["chainsaw.hydraflow.com.evil.com", "unknown_domain"],
    ["evilhydraflow.com", "unknown_domain"],
    ["127.0.0.1:3002", "unknown_domain"],
    ["a.b.hydraflow.com", "malformed"],
    ["-chainsaw.hydraflow.com", "malformed"],
    ["chain_saw.hydraflow.com", "malformed"],
    ["chainsaw..hydraflow.com", "malformed"],
    ["[::1]:3002", "malformed"],
    ["chainsaw.hydraflow.com:99999x", "malformed"],
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
    expect(normalizeHost("Chainsaw.Localhost:3002")).toBe("chainsaw.localhost");
    expect(normalizeHost("bad host")).toBeNull();
  });

  test("parseBaseDomains reads a list and has a safe default", () => {
    expect(parseBaseDomains(undefined)).toEqual(["hydraflow.com"]);
    expect(parseBaseDomains("hydraflow.com, Example.org")).toEqual(["hydraflow.com", "example.org"]);
    expect(parseBaseDomains(" , ")).toEqual(["hydraflow.com"]);
  });
});

import { describe, expect, test } from "bun:test";
import { isLoopbackHostname, resolveApiBaseUrl, resolveProductionAccess, resolveStaffAccess, toPublicAccess } from "./access";

const demoEnv = { FLOWFOKUS_DEMO_MODE: "true", FLOWFOKUS_DEMO_TOKEN: "flowfokus-local-demo-token" };

describe("resolveStaffAccess", () => {
  test("grants demo access in development on a local host", () => {
    expect(resolveStaffAccess({ dev: true, env: demoEnv, hostname: "localhost" })).toEqual({
      kind: "demo",
      token: "flowfokus-local-demo-token",
    });
  });

  test("never grants demo access in a production build, even with demo flags", () => {
    const access = resolveStaffAccess({ dev: false, env: demoEnv, hostname: "localhost" });
    expect(access).toEqual({ kind: "unavailable", reason: "sign_in_not_configured" });
    expect(resolveProductionAccess(demoEnv)).toEqual(access);
  });

  test("refuses demo access on a non-local host", () => {
    expect(resolveStaffAccess({ dev: true, env: demoEnv, hostname: "portal.flowfokus.com" })).toEqual({
      kind: "unavailable",
      reason: "demo_not_local",
    });
  });

  test("refuses a missing or short demo token", () => {
    for (const token of [undefined, "", "short"]) {
      const env = { FLOWFOKUS_DEMO_MODE: "true", ...(token === undefined ? {} : { FLOWFOKUS_DEMO_TOKEN: token }) };
      expect(resolveStaffAccess({ dev: true, env, hostname: "localhost" })).toEqual({
        kind: "unavailable",
        reason: "demo_token_invalid",
      });
    }
  });

  test("demo mode must be exactly 'true'", () => {
    const env = { ...demoEnv, FLOWFOKUS_DEMO_MODE: "1" };
    expect(resolveStaffAccess({ dev: true, env, hostname: "localhost" }).kind).toBe("unavailable");
  });

  test("fails closed when WorkOS is configured but not integrated", () => {
    const env = { WORKOS_CLIENT_ID: "client", WORKOS_API_KEY: "key", WORKOS_COOKIE_PASSWORD: "x".repeat(32) };
    expect(resolveStaffAccess({ dev: false, env, hostname: "portal.flowfokus.com" })).toEqual({
      kind: "unavailable",
      reason: "sign_in_not_integrated",
    });
  });
});

describe("toPublicAccess", () => {
  test("never exposes the token", () => {
    const access = resolveStaffAccess({ dev: true, env: demoEnv, hostname: "localhost" });
    const exposed = toPublicAccess(access);
    expect(exposed).toEqual({ kind: "demo" });
    expect(JSON.stringify(exposed)).not.toContain("flowfokus-local-demo-token");
  });
});

describe("isLoopbackHostname", () => {
  test.each([
    ["localhost", true],
    ["chainsaw.localhost", true],
    ["127.0.0.1", true],
    ["[::1]", true],
    ["localhost.example.com", false],
    ["portal.flowfokus.com", false],
    ["10.0.0.5", false],
  ])("%s → %p", (hostname, expected) => {
    expect(isLoopbackHostname(hostname)).toBe(expected);
  });
});

describe("resolveApiBaseUrl", () => {
  test("defaults to local Rails in development only", () => {
    expect(resolveApiBaseUrl(true, {})).toBe("http://127.0.0.1:3000");
    expect(resolveApiBaseUrl(false, {})).toBeUndefined();
    expect(resolveApiBaseUrl(false, { API_BASE_URL: "https://api.flowfokus.com" })).toBe("https://api.flowfokus.com");
  });
});

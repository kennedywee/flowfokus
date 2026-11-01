import { describe, expect, test } from "bun:test";
import { gymAuthOrigins, resolveMemberAccess, safeReturnPath, toBrowserUrl, workosSetting, type SiteEnv } from "./member-access";

const local: SiteEnv = {
  WORKOS_CLIENT_ID: "client_local",
  WORKOS_API_KEY: "sk_test",
  WORKOS_REDIRECT_URI: "http://chainsaw.localhost:4002/callback",
  WORKOS_COOKIE_PASSWORD: "x".repeat(40),
  WORKOS_API_HOSTNAME: "workos",
  WORKOS_API_PORT: "4100",
  WORKOS_API_HTTPS: "false",
  WORKOS_BROWSER_URL: "http://localhost:4100",
};
const production: SiteEnv = { ...local, WORKOS_REDIRECT_URI: "https://chainsaw.flowfokus.com/callback", WORKOS_VERIFIED: "true" };

describe("resolveMemberAccess", () => {
  test("missing settings turn sign-in off with a reason", () => {
    expect(resolveMemberAccess({ dev: true, env: {} })).toEqual({ kind: "unavailable", reason: "sign_in_not_configured" });
    expect(resolveMemberAccess({ dev: true, env: { ...local, WORKOS_COOKIE_PASSWORD: "short" } })).toEqual({
      kind: "unavailable",
      reason: "sign_in_misconfigured",
    });
  });

  test("development accepts the emulator settings", () => {
    expect(resolveMemberAccess({ dev: true, env: local })).toEqual({ kind: "workos" });
  });

  test("production needs HTTPS, an API key, and explicit verification", () => {
    expect(resolveMemberAccess({ dev: false, env: local }).kind).toBe("unavailable");
    expect(resolveMemberAccess({ dev: false, env: { ...production, WORKOS_VERIFIED: undefined } })).toEqual({
      kind: "unavailable",
      reason: "sign_in_not_verified",
    });
    expect(resolveMemberAccess({ dev: false, env: production })).toEqual({ kind: "workos" });
  });
});

describe("workosSetting", () => {
  test("production never passes emulator settings, and the cookie is host-only", () => {
    expect(workosSetting("WORKOS_API_HOSTNAME", { dev: false, env: production })).toBeUndefined();
    expect(workosSetting("WORKOS_COOKIE_DOMAIN", { dev: false, env: production })).toBeUndefined();
    expect(workosSetting("WORKOS_COOKIE_NAME", { dev: false, env: production })).toBe("__Host-hf_session");
    expect(workosSetting("WORKOS_COOKIE_NAME", { dev: true, env: local })).toBe("hf_session");
  });
});

describe("gymAuthOrigins", () => {
  test("each gym host gets its own callback", () => {
    expect(gymAuthOrigins("http://ironworks.localhost:4002/auth/start", { dev: true, env: local })).toEqual({
      redirectUri: "http://ironworks.localhost:4002/callback",
      home: "http://ironworks.localhost:4002/",
    });
    expect(gymAuthOrigins("https://ironworks.flowfokus.com/auth/start", { dev: false, env: production })?.redirectUri).toBe(
      "https://ironworks.flowfokus.com/callback",
    );
  });

  test("production refuses plain HTTP; development refuses another port", () => {
    expect(gymAuthOrigins("http://ironworks.flowfokus.com/auth/start", { dev: false, env: production })).toBeNull();
    expect(gymAuthOrigins("http://ironworks.localhost:9999/auth/start", { dev: true, env: local })).toBeNull();
  });
});

describe("helpers", () => {
  test("return paths stay on this host", () => {
    expect(safeReturnPath("/account?x=1")).toBe("/account?x=1");
    for (const value of ["//evil.example", "https://evil.example/", "/\\evil", null]) expect(safeReturnPath(value)).toBe("/account");
  });

  test("emulator URLs move to the browser address in development only", () => {
    const url = "http://workos:4100/user_management/authorize?x=1";
    expect(toBrowserUrl(url, { dev: true, env: local })).toBe("http://localhost:4100/user_management/authorize?x=1");
    expect(toBrowserUrl(url, { dev: false, env: local })).toBe(url);
  });
});

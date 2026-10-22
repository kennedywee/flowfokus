import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DEV_AUTH_HOSTS,
  LOCAL_SESSION_COOKIE,
  SESSION_COOKIE,
  devAuthHosts,
  isPrivateDevHost,
  resolveApiBaseUrl,
  resolveAuthOrigins,
  resolveProductionAccess,
  resolveStaffAccess,
  safeReturnPath,
  toBrowserUrl,
  toPublicAccess,
  workosBrowserOrigin,
  workosSetting,
  type PortalEnv,
} from "./access";

const demoEnv = { FLOWFOKUS_DEMO_MODE: "true", FLOWFOKUS_DEMO_TOKEN: "flowfokus-local-demo-token" };

describe("resolveStaffAccess", () => {
  test("grants demo access in development without a hostname restriction", () => {
    expect(resolveStaffAccess({ dev: true, env: demoEnv })).toEqual({
      kind: "demo",
      token: "flowfokus-local-demo-token",
    });
  });

  test("never grants demo access in a production build, even with demo flags", () => {
    const access = resolveStaffAccess({ dev: false, env: demoEnv });
    expect(access).toEqual({ kind: "unavailable", reason: "sign_in_not_configured" });
    expect(resolveProductionAccess(demoEnv)).toEqual(access);
  });

  test("refuses a missing or short demo token", () => {
    for (const token of [undefined, "", "short"]) {
      const env = { FLOWFOKUS_DEMO_MODE: "true", ...(token === undefined ? {} : { FLOWFOKUS_DEMO_TOKEN: token }) };
      expect(resolveStaffAccess({ dev: true, env })).toEqual({
        kind: "unavailable",
        reason: "demo_token_invalid",
      });
    }
  });

  test("demo mode must be exactly 'true'", () => {
    const env = { ...demoEnv, FLOWFOKUS_DEMO_MODE: "1" };
    expect(resolveStaffAccess({ dev: true, env }).kind).toBe("unavailable");
  });
});

const emulatorEnv: PortalEnv = {
  WORKOS_CLIENT_ID: "client_flowfokus_local",
  WORKOS_API_KEY: "sk_test_default",
  WORKOS_REDIRECT_URI: "http://localhost:4001/callback",
  WORKOS_COOKIE_PASSWORD: "local-only-cookie-password-0123456789abcdef",
  WORKOS_API_HOSTNAME: "workos",
  WORKOS_API_PORT: "4100",
  WORKOS_API_HTTPS: "false",
  WORKOS_BROWSER_URL: "http://localhost:4100",
};

const productionEnv: PortalEnv = {
  WORKOS_CLIENT_ID: "client_live",
  WORKOS_API_KEY: "sk_live_key",
  WORKOS_REDIRECT_URI: "https://portal.flowfokus.com/callback",
  WORKOS_COOKIE_PASSWORD: "p".repeat(32),
};

describe("WorkOS access", () => {
  test("development uses WorkOS sign-in with the emulator settings", () => {
    expect(resolveStaffAccess({ dev: true, env: emulatorEnv })).toEqual({ kind: "workos" });
  });

  test("the demo flag wins in development, and only there", () => {
    const env = { ...emulatorEnv, ...demoEnv };
    expect(resolveStaffAccess({ dev: true, env }).kind).toBe("demo");
    expect(resolveStaffAccess({ dev: false, env }).kind).toBe("unavailable");
  });

  test("development refuses a short cookie password or a bad callback address", () => {
    for (const env of [
      { ...emulatorEnv, WORKOS_COOKIE_PASSWORD: "short" },
      { ...emulatorEnv, WORKOS_REDIRECT_URI: "not a url" },
    ]) {
      expect(resolveStaffAccess({ dev: true, env })).toEqual({ kind: "unavailable", reason: "sign_in_misconfigured" });
    }
    expect(resolveStaffAccess({ dev: true, env: {} })).toEqual({ kind: "unavailable", reason: "sign_in_not_configured" });
  });

  test("production refuses the emulator settings", () => {
    // HTTP callback: misconfigured, whatever else is set.
    expect(resolveStaffAccess({ dev: false, env: { ...emulatorEnv, WORKOS_VERIFIED: "true" } })).toEqual({
      kind: "unavailable",
      reason: "sign_in_misconfigured",
    });
  });

  test("production needs an API key and a 32-character cookie password", () => {
    for (const env of [
      { ...productionEnv, WORKOS_API_KEY: undefined, WORKOS_VERIFIED: "true" },
      { ...productionEnv, WORKOS_COOKIE_PASSWORD: "short", WORKOS_VERIFIED: "true" },
    ]) {
      expect(resolveProductionAccess(env)).toEqual({ kind: "unavailable", reason: "sign_in_misconfigured" });
    }
  });

  test("production stays closed until a person verifies real WorkOS", () => {
    expect(resolveProductionAccess(productionEnv)).toEqual({ kind: "unavailable", reason: "sign_in_not_verified" });
    expect(resolveProductionAccess({ ...productionEnv, WORKOS_VERIFIED: "yes" }).kind).toBe("unavailable");
    expect(resolveProductionAccess({ ...productionEnv, WORKOS_VERIFIED: "true" })).toEqual({ kind: "workos" });
  });
});

describe("workosSetting", () => {
  test("production drops the emulator host and never reaches it", () => {
    const env = { ...productionEnv, WORKOS_API_HOSTNAME: "workos", WORKOS_API_PORT: "4100", WORKOS_API_HTTPS: "false" };
    for (const name of ["WORKOS_API_HOSTNAME", "WORKOS_API_PORT", "WORKOS_API_HTTPS"]) {
      expect(workosSetting(name, { dev: false, env })).toBeUndefined();
      expect(workosSetting(name, { dev: true, env })).toBe(env[name as keyof PortalEnv]);
    }
  });

  test("the session cookie is host-only, and __Host- over HTTPS", () => {
    expect(workosSetting("WORKOS_COOKIE_DOMAIN", { dev: false, env: { ...productionEnv, WORKOS_COOKIE_DOMAIN: "flowfokus.com" } as PortalEnv })).toBeUndefined();
    expect(workosSetting("WORKOS_COOKIE_NAME", { dev: false, env: productionEnv })).toBe(SESSION_COOKIE);
    expect(SESSION_COOKIE.startsWith("__Host-")).toBe(true);
    expect(workosSetting("WORKOS_COOKIE_NAME", { dev: true, env: emulatorEnv })).toBe(LOCAL_SESSION_COOKIE);
    expect(workosSetting("WORKOS_COOKIE_SAME_SITE", { dev: false, env: productionEnv })).toBe("lax");
  });

  test("unknown settings read as unset", () => {
    expect(workosSetting("WORKOS_CLAIM_TOKEN", { dev: true, env: emulatorEnv })).toBeUndefined();
  });
});

describe("browser URLs", () => {
  test("development moves emulator URLs to the browser origin", () => {
    const url = "http://workos:4100/user_management/authorize?client_id=x&state=y";
    expect(toBrowserUrl(url, { dev: true, env: emulatorEnv })).toBe("http://localhost:4100/user_management/authorize?client_id=x&state=y");
  });

  test("other URLs, and every production URL, pass through", () => {
    const other = "https://api.workos.com/user_management/authorize?x=1";
    expect(toBrowserUrl(other, { dev: true, env: emulatorEnv })).toBe(other);
    const internal = "http://workos:4100/user_management/authorize";
    expect(toBrowserUrl(internal, { dev: false, env: emulatorEnv })).toBe(internal);
  });

  test("the sign-out form may end at the WorkOS origin", () => {
    expect(workosBrowserOrigin({ dev: true, env: emulatorEnv })).toBe("http://localhost:4100");
    expect(workosBrowserOrigin({ dev: false, env: emulatorEnv })).toBe("https://api.workos.com");
  });
});

const TAILSCALE_IP = "100.89.45.88";
const tailnetEnv: PortalEnv = { ...emulatorEnv, FLOWFOKUS_DEV_AUTH_HOSTS: `localhost,127.0.0.1,::1,${TAILSCALE_IP}` };

function get(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("resolveAuthOrigins in development", () => {
  test("localhost keeps the configured callback and emulator address", () => {
    expect(resolveAuthOrigins(get("http://localhost:4001/sign-in"), { dev: true, env: tailnetEnv })).toEqual({
      allowed: true,
      redirectUri: "http://localhost:4001/callback",
      home: "http://localhost:4001/",
      browserUrl: "http://localhost:4100",
    });
  });

  test("an allowed Tailscale IP gets its own callback, start page, and emulator address", () => {
    expect(resolveAuthOrigins(get(`http://${TAILSCALE_IP}:4001/sign-in?returnTo=%2Fchainsaw%2Fmembers`), { dev: true, env: tailnetEnv })).toEqual({
      allowed: true,
      redirectUri: `http://${TAILSCALE_IP}:4001/callback`,
      home: `http://${TAILSCALE_IP}:4001/`,
      browserUrl: `http://${TAILSCALE_IP}:4100`,
    });
  });

  test("loopback IPs in the default list work without extra settings", () => {
    const { FLOWFOKUS_DEV_AUTH_HOSTS: _, ...env } = tailnetEnv;
    expect(resolveAuthOrigins(get("http://127.0.0.1:4001/"), { dev: true, env }).redirectUri).toBe("http://127.0.0.1:4001/callback");
    expect(resolveAuthOrigins(get("http://[::1]:4001/"), { dev: true, env })).toMatchObject({
      allowed: true,
      redirectUri: "http://[::1]:4001/callback",
      browserUrl: "http://[::1]:4100",
    });
  });

  test("a Tailscale IP that is not in the list is refused", () => {
    const origins = resolveAuthOrigins(get(`http://${TAILSCALE_IP}:4001/sign-in`), { dev: true, env: emulatorEnv });
    expect(origins).toEqual({
      allowed: false,
      redirectUri: "http://localhost:4001/callback",
      home: "http://localhost:4001/",
      browserUrl: "http://localhost:4100",
    });
  });

  test("a public host is refused, even when someone lists it", () => {
    const env = { ...tailnetEnv, FLOWFOKUS_DEV_AUTH_HOSTS: `${tailnetEnv.FLOWFOKUS_DEV_AUTH_HOSTS},evil.example,8.8.8.8` };
    for (const url of ["http://evil.example:4001/sign-in", "http://8.8.8.8:4001/sign-in"]) {
      expect(resolveAuthOrigins(get(url), { dev: true, env })).toMatchObject({ allowed: false, redirectUri: "http://localhost:4001/callback" });
    }
  });

  test("forwarded host headers never pick the callback", () => {
    const spoofed = { "X-Forwarded-Host": "evil.example", Forwarded: "host=evil.example", "X-Forwarded-Proto": "https" };
    expect(resolveAuthOrigins(get(`http://${TAILSCALE_IP}:4001/sign-in`, spoofed), { dev: true, env: tailnetEnv }).redirectUri).toBe(
      `http://${TAILSCALE_IP}:4001/callback`,
    );
    expect(resolveAuthOrigins(get("http://evil.example:4001/sign-in", { "X-Forwarded-Host": "localhost:4001" }), { dev: true, env: tailnetEnv }).allowed).toBe(false);
  });

  test("another port or scheme is refused", () => {
    for (const url of [`http://${TAILSCALE_IP}:4002/sign-in`, `https://${TAILSCALE_IP}:4001/sign-in`, `http://${TAILSCALE_IP}/sign-in`]) {
      expect(resolveAuthOrigins(get(url), { dev: true, env: tailnetEnv }).allowed).toBe(false);
    }
  });
});

describe("resolveAuthOrigins in production", () => {
  test("always uses the configured callback, whatever host the request names", () => {
    const expected = {
      allowed: true,
      redirectUri: "https://portal.flowfokus.com/callback",
      home: "https://portal.flowfokus.com/",
      browserUrl: undefined,
    };
    const env = { ...productionEnv, FLOWFOKUS_DEV_AUTH_HOSTS: TAILSCALE_IP, WORKOS_BROWSER_URL: "http://localhost:4100" };
    for (const url of ["https://portal.flowfokus.com/sign-in", `http://${TAILSCALE_IP}:4001/sign-in`, "https://evil.example/sign-in"]) {
      expect(resolveAuthOrigins(get(url, { "X-Forwarded-Host": "evil.example" }), { dev: false, env })).toEqual(expected);
    }
  });
});

describe("development auth hosts", () => {
  test("defaults to loopback only", () => {
    expect(DEFAULT_DEV_AUTH_HOSTS).toBe("localhost,127.0.0.1,::1");
    expect([...devAuthHosts({})]).toEqual(["localhost", "127.0.0.1", "[::1]"]);
  });

  test("keeps private and Tailscale hosts, drops public hosts and malformed entries", () => {
    const env = {
      FLOWFOKUS_DEV_AUTH_HOSTS:
        " LOCALHOST , 100.89.45.88, 192.168.1.20, fd7a:115c:a1e0::1, mac.tail1234.ts.net, example.com, 8.8.8.8, 100.128.0.1, localhost:4001, http://10.0.0.2, user@10.0.0.3, 10.0.0.4/x, , *",
    };
    expect([...devAuthHosts(env)]).toEqual(["localhost", "100.89.45.88", "192.168.1.20", "[fd7a:115c:a1e0::1]", "mac.tail1234.ts.net"]);
  });

  test("private host ranges", () => {
    for (const host of ["localhost", "app.localhost", "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "100.64.0.1", "100.127.255.255", "[::1]", "[fd7a:115c:a1e0::1]", "[fc00::1]", "box.tail.ts.net"]) {
      expect(isPrivateDevHost(host)).toBe(true);
    }
    for (const host of ["example.com", "localhost.example.com", "ts.net.example.com", "8.8.8.8", "172.32.0.1", "100.128.0.1", "100.63.255.255", "0.0.0.0", "[2001:db8::1]", "[fc::1]", "[fe80::1]"]) {
      expect(isPrivateDevHost(host)).toBe(false);
    }
  });
});

describe("browser URLs for the request host", () => {
  test("development moves emulator URLs to the request emulator address", () => {
    const url = "http://workos:4100/user_management/logout?session_id=s&return_to=x";
    expect(toBrowserUrl(url, { dev: true, env: tailnetEnv }, `http://${TAILSCALE_IP}:4100`)).toBe(
      `http://${TAILSCALE_IP}:4100/user_management/logout?session_id=s&return_to=x`,
    );
    expect(workosBrowserOrigin({ dev: true, env: tailnetEnv }, `http://${TAILSCALE_IP}:4100`)).toBe(`http://${TAILSCALE_IP}:4100`);
  });

  test("production ignores the request emulator address", () => {
    const internal = "http://workos:4100/user_management/authorize";
    expect(toBrowserUrl(internal, { dev: false, env: tailnetEnv }, `http://${TAILSCALE_IP}:4100`)).toBe(internal);
    expect(workosBrowserOrigin({ dev: false, env: tailnetEnv }, `http://${TAILSCALE_IP}:4100`)).toBe("https://api.workos.com");
  });
});

describe("safeReturnPath", () => {
  test("keeps same-origin paths with their query", () => {
    expect(safeReturnPath("/chainsaw/members?q=ann")).toBe("/chainsaw/members?q=ann");
  });

  test("turns anything else into the start page", () => {
    for (const value of [
      null,
      "",
      "chainsaw",
      "https://evil.example/",
      "//evil.example/path",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
    ]) {
      expect(safeReturnPath(value)).toBe("/");
    }
  });
});

describe("toPublicAccess", () => {
  test("never exposes the token", () => {
    const access = resolveStaffAccess({ dev: true, env: demoEnv });
    const exposed = toPublicAccess(access);
    expect(exposed).toEqual({ kind: "demo" });
    expect(JSON.stringify(exposed)).not.toContain("flowfokus-local-demo-token");
  });
});

describe("resolveApiBaseUrl", () => {
  test("defaults to local Rails in development only", () => {
    expect(resolveApiBaseUrl(true, {})).toBe("http://127.0.0.1:4000");
    expect(resolveApiBaseUrl(false, {})).toBeUndefined();
    expect(resolveApiBaseUrl(false, { API_BASE_URL: "https://api.flowfokus.com" })).toBe("https://api.flowfokus.com");
  });
});

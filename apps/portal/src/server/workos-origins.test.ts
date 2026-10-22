import { describe, expect, test } from "bun:test";
import { WorkOS } from "@workos-inc/node";
import { configure, CookieSessionStorage, createAuthService } from "@workos/authkit-session";
import { resolveAuthOrigins, toBrowserUrl, workosSetting, type AccessInput, type PortalEnv } from "./access";

/**
 * Runs the installed WorkOS SDK with the portal settings, as `server/workos.ts`
 * does, and checks the per-request callback, cookies, and logout address.
 * Builds URLs and cookies only; no request leaves the process.
 */

class TestStorage extends CookieSessionStorage<Request, Response> {
  async getCookie(): Promise<string | null> {
    return null;
  }
}

function service(input: AccessInput) {
  configure((name: string) => workosSetting(name, input));
  return createAuthService<Request, Response>({
    sessionStorageFactory: (config) => new TestStorage(config),
    clientFactory: (config) =>
      new WorkOS({ apiKey: config.apiKey, clientId: config.clientId, apiHostname: config.apiHostname, https: config.apiHttps, port: config.apiPort }),
  });
}

function setCookies(headers: Record<string, string | string[]> | undefined): string[] {
  const value = headers?.["Set-Cookie"];
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

const emulatorEnv: PortalEnv = {
  WORKOS_CLIENT_ID: "client_flowfokus_local",
  WORKOS_API_KEY: "sk_test_default",
  WORKOS_REDIRECT_URI: "http://localhost:4001/callback",
  WORKOS_COOKIE_PASSWORD: "local-only-cookie-password-0123456789abcdef",
  WORKOS_API_HOSTNAME: "workos",
  WORKOS_API_PORT: "4100",
  WORKOS_API_HTTPS: "false",
  WORKOS_BROWSER_URL: "http://localhost:4100",
  FLOWFOKUS_DEV_AUTH_HOSTS: "localhost,127.0.0.1,::1,100.89.45.88",
};

async function signIn(input: AccessInput, url: string, returnPathname = "/") {
  const origins = resolveAuthOrigins(new Request(url), input);
  const result = await service(input).createSignIn(undefined, { returnPathname, redirectUri: origins.redirectUri });
  return { origins, location: new URL(toBrowserUrl(result.url, input, origins.browserUrl)), cookies: setCookies(result.headers) };
}

describe("development sign-in through the SDK", () => {
  const dev: AccessInput = { dev: true, env: emulatorEnv };

  for (const host of ["localhost", "100.89.45.88"]) {
    test(`${host}: AuthKit opens on the same host and returns to its callback`, async () => {
      const { location, cookies } = await signIn(dev, `http://${host}:4001/sign-in?returnTo=%2Fchainsaw%2Fmembers`, "/chainsaw/members");
      expect(location.origin).toBe(`http://${host}:4100`);
      expect(location.pathname).toBe("/user_management/authorize");
      expect(location.searchParams.get("redirect_uri")).toBe(`http://${host}:4001/callback`);
      expect(location.searchParams.get("client_id")).toBe("client_flowfokus_local");

      // The PKCE verifier cookie: host-only, HttpOnly, and not Secure, so it works over plain HTTP on an IP.
      expect(cookies).toHaveLength(1);
      const cookie = cookies[0]!;
      expect(cookie).toStartWith("wos-auth-verifier");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/");
      expect(cookie).not.toContain("Secure");
      expect(cookie).not.toContain("Domain");
    });
  }

  test("each request gets its own callback; the shared configuration stays on localhost", async () => {
    const [tailnet, local] = await Promise.all([
      signIn(dev, "http://100.89.45.88:4001/sign-in"),
      signIn(dev, "http://localhost:4001/sign-in"),
    ]);
    expect(tailnet.location.searchParams.get("redirect_uri")).toBe("http://100.89.45.88:4001/callback");
    expect(local.location.searchParams.get("redirect_uri")).toBe("http://localhost:4001/callback");
    expect(workosSetting("WORKOS_REDIRECT_URI", dev)).toBe("http://localhost:4001/callback");
  });

  test("sign-out ends at the emulator on the same host and returns to that start page", async () => {
    const origins = resolveAuthOrigins(new Request("http://100.89.45.88:4001/sign-out", { method: "POST" }), dev);
    const { logoutUrl, headers } = await service(dev).signOut("session_123", { returnTo: origins.home });
    const location = new URL(toBrowserUrl(logoutUrl, dev, origins.browserUrl));
    expect(location.origin).toBe("http://100.89.45.88:4100");
    expect(location.searchParams.get("return_to")).toBe("http://100.89.45.88:4001/");

    const [cookie] = setCookies(headers);
    expect(cookie).toStartWith("hf_session=;");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toContain("Domain");
  });
});

describe("production sign-in through the SDK", () => {
  const production: AccessInput = {
    dev: false,
    env: {
      ...emulatorEnv,
      WORKOS_API_KEY: "sk_live_key",
      WORKOS_REDIRECT_URI: "https://portal.flowfokus.com/callback",
      WORKOS_COOKIE_PASSWORD: "p".repeat(32),
      WORKOS_VERIFIED: "true",
    },
  };

  test("uses api.workos.com and the configured callback, whatever host the request names", async () => {
    for (const url of ["https://portal.flowfokus.com/sign-in", "http://100.89.45.88:4001/sign-in", "https://evil.example/sign-in"]) {
      const { location, cookies } = await signIn(production, url);
      expect(location.origin).toBe("https://api.workos.com");
      expect(location.searchParams.get("redirect_uri")).toBe("https://portal.flowfokus.com/callback");
      expect(cookies[0]).toContain("Secure");
      expect(cookies[0]).not.toContain("Domain");
    }
  });

  test("sign-out returns to the configured start page", async () => {
    const origins = resolveAuthOrigins(new Request("https://evil.example/sign-out", { method: "POST" }), production);
    const { logoutUrl, headers } = await service(production).signOut("session_123", { returnTo: origins.home });
    const location = new URL(toBrowserUrl(logoutUrl, production, origins.browserUrl));
    expect(location.origin).toBe("https://api.workos.com");
    expect(location.searchParams.get("return_to")).toBe("https://portal.flowfokus.com/");
    expect(setCookies(headers)[0]).toStartWith("__Host-hf_session=;");
  });
});

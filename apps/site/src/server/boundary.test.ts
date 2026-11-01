import { describe, expect, test } from "bun:test";
import { contentSecurityPolicy, isAllowedServerFn, rejectUnsafeRequest, securityHeaders } from "./boundary";

const ORIGIN = "http://chainsaw.localhost:4002";

function request(path: string, method: string, contentType?: string) {
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: contentType ? { "Content-Type": contentType } : {},
    ...(method === "POST" || method === "PUT" ? { body: "{}" } : {}),
  });
}

/** A development server function ID, built the way Start builds it. */
function devId(file: string, exportName: string): string {
  return Buffer.from(JSON.stringify({ file, export: exportName }), "utf8").toString("base64url");
}

const own = `/_serverFn/${devId("/src/lib/site.functions.ts?tss-serverfn-split", "submitLinkCode_createServerFn_handler")}`;

describe("rejectUnsafeRequest", () => {
  test("pages accept GET and HEAD only", () => {
    expect(rejectUnsafeRequest(request("/", "GET"), "router")).toBeNull();
    expect(rejectUnsafeRequest(request("/", "HEAD"), "router")).toBeNull();
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(rejectUnsafeRequest(request("/account", method, "application/json"), "router")?.status).toBe(405);
    }
  });

  test("sign-out accepts POST only", () => {
    expect(rejectUnsafeRequest(request("/sign-out", "POST"), "router")).toBeNull();
    expect(rejectUnsafeRequest(request("/sign-out", "GET"), "router")?.status).toBe(405);
  });

  test("server function writes need POST with JSON", () => {
    expect(rejectUnsafeRequest(request(own, "GET"), "serverFn", true)).toBeNull();
    expect(rejectUnsafeRequest(request(own, "POST", "application/json"), "serverFn", true)).toBeNull();
    expect(rejectUnsafeRequest(request(own, "POST", "text/plain"), "serverFn", true)?.status).toBe(415);
    expect(rejectUnsafeRequest(request(own, "POST", "application/x-www-form-urlencoded"), "serverFn", true)?.status).toBe(415);
    expect(rejectUnsafeRequest(request(own, "PUT", "application/json"), "serverFn", true)?.status).toBe(405);
  });
});

describe("isAllowedServerFn", () => {
  test("development allows only the site's own server functions", () => {
    expect(isAllowedServerFn(own, true)).toBe(true);
    const sdk = "node_modules/@workos/authkit-tanstack-react-start/dist/server/actions.js?tss-serverfn-split";
    expect(isAllowedServerFn(`/_serverFn/${devId(`/${sdk}`, "getAccessToken_createServerFn_handler")}`, true)).toBe(false);
    expect(isAllowedServerFn(`/_serverFn/${devId("/src/server/member-auth.ts?tss-serverfn-split", "x_createServerFn_handler")}`, true)).toBe(false);
    expect(isAllowedServerFn("/_serverFn/abc", true)).toBe(false);
  });

  test("production IDs are opaque", () => {
    expect(isAllowedServerFn("/_serverFn/abc123", false)).toBe(true);
    expect(isAllowedServerFn("/_serverFn/a%2Fb", false)).toBe(false);
  });
});

describe("security headers", () => {
  test("production CSP allows only nonce scripts and same-origin assets", () => {
    const csp = contentSecurityPolicy("n0nce", false);
    expect(csp).toContain("script-src 'self' 'nonce-n0nce'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });

  test("forms post to the site, plus the WorkOS sign-out origin when given", () => {
    expect(contentSecurityPolicy("n", false)).toContain("form-action 'self';");
    expect(contentSecurityPolicy("n", false, ["https://api.workos.com"])).toContain("form-action 'self' https://api.workos.com;");
  });

  test("responses are private and not stored", () => {
    const headers = securityHeaders("n0nce", false);
    expect(headers["Cache-Control"]).toBe("private, no-store");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });
});

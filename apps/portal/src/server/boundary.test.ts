import { describe, expect, test } from "bun:test";
import { contentSecurityPolicy, createNonce, isAllowedServerFn, rejectUnsafeRequest, securityHeaders } from "./boundary";

function request(method: string, contentType?: string) {
  return new Request("http://localhost:4001/_serverFn/x", {
    method,
    headers: contentType ? { "Content-Type": contentType } : {},
    ...(method === "POST" || method === "PUT" ? { body: "{}" } : {}),
  });
}

describe("rejectUnsafeRequest", () => {
  test("pages accept GET and HEAD only", () => {
    expect(rejectUnsafeRequest(request("GET"), "router")).toBeNull();
    expect(rejectUnsafeRequest(request("HEAD"), "router")).toBeNull();
    expect(rejectUnsafeRequest(request("POST", "application/json"), "router")?.status).toBe(405);
  });

  test("server function writes need POST with JSON", () => {
    expect(rejectUnsafeRequest(request("GET"), "serverFn")).toBeNull();
    expect(rejectUnsafeRequest(request("POST", "application/json"), "serverFn")).toBeNull();
    expect(rejectUnsafeRequest(request("POST", "application/json; charset=utf-8"), "serverFn")).toBeNull();
    expect(rejectUnsafeRequest(request("POST", "text/plain"), "serverFn")?.status).toBe(415);
    expect(rejectUnsafeRequest(request("POST", "application/x-www-form-urlencoded"), "serverFn")?.status).toBe(415);
    expect(rejectUnsafeRequest(request("POST", "multipart/form-data; boundary=x"), "serverFn")?.status).toBe(415);
    expect(rejectUnsafeRequest(request("POST"), "serverFn")?.status).toBe(415);
    expect(rejectUnsafeRequest(request("PUT", "application/json"), "serverFn")?.status).toBe(405);
    expect(rejectUnsafeRequest(request("DELETE"), "serverFn")?.status).toBe(405);
  });
});

describe("sign-out", () => {
  test("accepts POST only", () => {
    const at = (method: string) => new Request("http://localhost:4001/sign-out", { method, ...(method === "POST" ? { body: "" } : {}) });
    expect(rejectUnsafeRequest(at("POST"), "router")).toBeNull();
    expect(rejectUnsafeRequest(at("GET"), "router")?.status).toBe(405);
    expect(rejectUnsafeRequest(at("HEAD"), "router")?.status).toBe(405);
  });
});

/** A development server function ID, built the way Start builds it. */
function devId(file: string, exportName: string): string {
  return Buffer.from(JSON.stringify({ file, export: exportName }), "utf8").toString("base64url");
}

describe("isAllowedServerFn", () => {
  const own = devId("/src/lib/staff.functions.ts?tss-serverfn-split", "getAccess_createServerFn_handler");

  test("development allows the portal's own server functions", () => {
    expect(isAllowedServerFn(`/_serverFn/${own}`, true)).toBe(true);
    expect(isAllowedServerFn(`/_serverFn/${devId("/src/lib/desk.functions.ts?tss-serverfn-split", "setDeskLocation_createServerFn_handler")}`, true)).toBe(true);
  });

  test("development refuses the SDK's server functions, however they are named", () => {
    const sdk = "node_modules/@workos/authkit-tanstack-react-start/dist/server/actions.js?tss-serverfn-split";
    for (const file of [
      `/${sdk}`,
      `/@fs/home/dev/flowfokus/${sdk}`,
      `/@id/${sdk}`,
      "/src/lib/../../../../node_modules/x.functions.ts?tss-serverfn-split",
      "/src/routes/index.tsx?tss-serverfn-split",
      "/src/lib/staff.functions.ts",
    ]) {
      expect(isAllowedServerFn(`/_serverFn/${devId(file, "getAccessTokenAction_createServerFn_handler")}`, true)).toBe(false);
    }
  });

  test("development refuses IDs that are not canonical", () => {
    const encoded = `${own.slice(0, 4)}%41${own.slice(4)}`;
    expect(isAllowedServerFn(`/_serverFn/${encoded}`, true)).toBe(false);
    expect(isAllowedServerFn(`/_serverFn/${own}=`, true)).toBe(false);
    expect(isAllowedServerFn(`/_serverFn/${own}.`, true)).toBe(false);
    expect(isAllowedServerFn(`/_serverFn/${Buffer.from(JSON.stringify({ file: "/src/lib/staff.functions.ts?tss-serverfn-split", export: "getAccess_createServerFn_handler", extra: 1 })).toString("base64url")}`, true)).toBe(false);
    expect(isAllowedServerFn("/_serverFn/", true)).toBe(false);
    expect(isAllowedServerFn("/_serverFn/not-json", true)).toBe(false);
  });

  test("Start reads the first segment, and so does the check", () => {
    const sdk = devId("/node_modules/@workos/authkit-tanstack-react-start/dist/server/actions.js?tss-serverfn-split", "getAccessTokenAction_createServerFn_handler");
    expect(isAllowedServerFn(`/_serverFn/${sdk}/${own}`, true)).toBe(false);
  });

  test("production IDs are opaque; Start looks them up in the build manifest", () => {
    expect(isAllowedServerFn(`/_serverFn/${"a".repeat(64)}`, false)).toBe(true);
    expect(isAllowedServerFn("/_serverFn/abc%2Fdef", false)).toBe(false);
  });

  test("refused calls get 404 before any handler runs", () => {
    const sdk = devId("/node_modules/@workos/authkit-tanstack-react-start/dist/server/actions.js?tss-serverfn-split", "getAccessTokenAction_createServerFn_handler");
    const call = new Request(`http://localhost:4001/_serverFn/${sdk}`);
    expect(rejectUnsafeRequest(call, "serverFn", true)?.status).toBe(404);
    expect(rejectUnsafeRequest(new Request(`http://localhost:4001/_serverFn/${own}`), "serverFn", true)).toBeNull();
  });
});

describe("security headers", () => {
  test("forms post to the portal, plus the WorkOS sign-out origin when given", () => {
    expect(contentSecurityPolicy("abc", false)).toContain("form-action 'self';");
    expect(contentSecurityPolicy("abc", false, ["https://api.workos.com"])).toContain("form-action 'self' https://api.workos.com;");
  });

  test("production CSP allows only nonce scripts", () => {
    const csp = contentSecurityPolicy("abc", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self';");
  });

  test("portal responses are never cached", () => {
    expect(securityHeaders("abc", false)["Cache-Control"]).toBe("private, no-store");
  });

  test("nonces are fresh", () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});

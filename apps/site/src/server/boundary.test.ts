import { describe, expect, test } from "bun:test";
import { contentSecurityPolicy, rejectUnsafeRequest, securityHeaders } from "./boundary";

describe("rejectUnsafeRequest", () => {
  test("the site is read-only in Sprint 1", () => {
    const get = new Request("http://chainsaw.localhost:3002/");
    expect(rejectUnsafeRequest(get, "router")).toBeNull();
    expect(rejectUnsafeRequest(get, "serverFn")).toBeNull();
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const request = new Request("http://chainsaw.localhost:3002/_serverFn/x", {
        method,
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(rejectUnsafeRequest(request, "serverFn")?.status).toBe(405);
    }
  });
});

describe("security headers", () => {
  test("production CSP allows only nonce scripts and same-origin assets", () => {
    const csp = contentSecurityPolicy("n0nce", false);
    expect(csp).toContain("script-src 'self' 'nonce-n0nce'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });

  test("responses are not stored", () => {
    const headers = securityHeaders("n0nce", false);
    expect(headers["Cache-Control"]).toBe("no-store");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });
});

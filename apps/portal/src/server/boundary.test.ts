import { describe, expect, test } from "bun:test";
import { contentSecurityPolicy, createNonce, rejectUnsafeRequest, securityHeaders } from "./boundary";

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

describe("security headers", () => {
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

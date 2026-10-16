/**
 * The request chain from `src/start.ts`, run with the real SDK CSRF check:
 * our method and content-type guard first, then `createCsrfMiddleware(csrfOptions)`.
 */
import { describe, expect, test } from "bun:test";
import { isCsrfRequestAllowed } from "@tanstack/react-start";
import { csrfOptions, rejectUnsafeRequest, type HandlerType } from "./boundary";

const ORIGIN = "http://localhost:3001";

async function decide(request: Request, handlerType: HandlerType): Promise<number> {
  const rejected = rejectUnsafeRequest(request, handlerType);
  if (rejected) return rejected.status;
  const ctx = { request, handlerType, pathname: new URL(request.url).pathname, context: {}, next: () => undefined };
  if (csrfOptions.filter(ctx) && !(await isCsrfRequestAllowed(csrfOptions, ctx as never))) return 403;
  return 200;
}

function page(headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/chainsaw`, { headers });
}

function write(headers: Record<string, string>) {
  return new Request(`${ORIGIN}/_serverFn/createSale`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  });
}

describe("safe navigation", () => {
  test.each([
    ["plain request (curl)", {}],
    ["typed address", { "Sec-Fetch-Site": "none" }],
    ["link from another site", { "Sec-Fetch-Site": "cross-site", Referer: "https://example.com/" }],
    ["same-origin link", { "Sec-Fetch-Site": "same-origin" }],
  ])("%s opens the page", async (_name, headers) => {
    expect(await decide(page(headers), "router")).toBe(200);
  });

  test("HEAD is allowed", async () => {
    expect(await decide(new Request(`${ORIGIN}/chainsaw`, { method: "HEAD" }), "router")).toBe(200);
  });
});

describe("server function writes", () => {
  test("same-origin JSON POST is allowed", async () => {
    expect(await decide(write({ "Sec-Fetch-Site": "same-origin" }), "serverFn")).toBe(200);
    expect(await decide(write({ Origin: ORIGIN }), "serverFn")).toBe(200);
  });

  test.each([
    ["cross-site fetch", { "Sec-Fetch-Site": "cross-site" }],
    ["same-site sibling host", { "Sec-Fetch-Site": "same-site" }],
    ["foreign Origin", { Origin: "https://evil.example" }],
    ["foreign Referer", { Referer: "https://evil.example/form" }],
    ["look-alike Referer", { Referer: `${ORIGIN}.evil.example/` }],
    ["no origin evidence at all", {}],
  ])("%s is refused with 403", async (_name, headers) => {
    expect(await decide(write(headers), "serverFn")).toBe(403);
  });

  test("a form post (no JSON) is refused before the origin check", async () => {
    const form = new Request(`${ORIGIN}/_serverFn/createSale`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Sec-Fetch-Site": "same-origin" },
      body: "a=1",
    });
    expect(await decide(form, "serverFn")).toBe(415);
  });

  test("cross-site server function reads are refused too", async () => {
    const read = new Request(`${ORIGIN}/_serverFn/listMembers`, { headers: { "Sec-Fetch-Site": "cross-site" } });
    expect(await decide(read, "serverFn")).toBe(403);
  });

  test("pages never accept POST, even same-origin", async () => {
    const post = new Request(`${ORIGIN}/chainsaw`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
      body: "{}",
    });
    expect(await decide(post, "router")).toBe(405);
  });
});

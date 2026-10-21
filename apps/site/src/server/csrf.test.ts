/**
 * The request chain from `src/start.ts`, run with the real SDK CSRF check:
 * our method and content-type guard first, then `createCsrfMiddleware(csrfOptions)`.
 */
import { describe, expect, test } from "bun:test";
import { isCsrfRequestAllowed } from "@tanstack/react-start";
import { csrfOptions, rejectUnsafeRequest, type HandlerType } from "./boundary";

const ORIGIN = "http://chainsaw.localhost:4002";

async function decide(request: Request, handlerType: HandlerType): Promise<number> {
  const rejected = rejectUnsafeRequest(request, handlerType);
  if (rejected) return rejected.status;
  const ctx = { request, handlerType, pathname: new URL(request.url).pathname, context: {}, next: () => undefined };
  if (csrfOptions.filter(ctx) && !(await isCsrfRequestAllowed(csrfOptions, ctx as never))) return 403;
  return 200;
}

function page(headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/`, { headers });
}

function write(headers: Record<string, string>) {
  return new Request(`${ORIGIN}/_serverFn/getSitePage`, {
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
    expect(await decide(new Request(`${ORIGIN}/`, { method: "HEAD" }), "router")).toBe(200);
  });
});

describe("server functions (read-only site)", () => {
  test("same-origin read is allowed", async () => {
    const read = new Request(`${ORIGIN}/_serverFn/getSitePage`, { headers: { "Sec-Fetch-Site": "same-origin" } });
    expect(await decide(read, "serverFn")).toBe(200);
  });

  test.each([
    ["cross-site", { "Sec-Fetch-Site": "cross-site" }],
    ["foreign Origin", { Origin: "https://evil.example" }],
    ["no origin evidence", {}],
  ])("%s read is refused with 403", async (_name, headers) => {
    const read = new Request(`${ORIGIN}/_serverFn/getSitePage`, { headers });
    expect(await decide(read, "serverFn")).toBe(403);
  });

  test("every write is refused, even same-origin JSON", async () => {
    expect(await decide(write({ "Sec-Fetch-Site": "same-origin" }), "serverFn")).toBe(405);
    expect(await decide(write({ "Sec-Fetch-Site": "cross-site" }), "serverFn")).toBe(405);
  });
});

/**
 * The request chain from `src/start.ts`, run with the real SDK CSRF check:
 * our method and content-type guard first, then `createCsrfMiddleware(csrfOptions)`.
 */
import { describe, expect, test } from "bun:test";
import { isCsrfRequestAllowed } from "@tanstack/react-start";
import { csrfOptions, rejectUnsafeRequest, type HandlerType } from "./boundary";

const ORIGIN = "http://chainsaw.localhost:4002";

async function decide(request: Request, handlerType: HandlerType): Promise<number> {
  const rejected = rejectUnsafeRequest(request, handlerType, true);
  if (rejected) return rejected.status;
  const ctx = { request, handlerType, pathname: new URL(request.url).pathname, context: {}, next: () => undefined };
  if (csrfOptions.filter(ctx) && !(await isCsrfRequestAllowed(csrfOptions, ctx as never))) return 403;
  return 200;
}

function page(headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/`, { headers });
}

const LINK = `/_serverFn/${Buffer.from(JSON.stringify({ file: "/src/lib/site.functions.ts?tss-serverfn-split", export: "submitLinkCode_createServerFn_handler" }), "utf8").toString("base64url")}`;

function write(headers: Record<string, string>) {
  return new Request(`${ORIGIN}${LINK}`, {
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

describe("server functions", () => {
  test("same-origin read is allowed", async () => {
    const read = new Request(`${ORIGIN}${LINK}`, { headers: { "Sec-Fetch-Site": "same-origin" } });
    expect(await decide(read, "serverFn")).toBe(200);
  });

  test.each([
    ["cross-site", { "Sec-Fetch-Site": "cross-site" }],
    ["foreign Origin", { Origin: "https://evil.example" }],
    ["no origin evidence", {}],
  ])("%s read is refused with 403", async (_name, headers) => {
    const read = new Request(`${ORIGIN}${LINK}`, { headers });
    expect(await decide(read, "serverFn")).toBe(403);
  });

  test("a same-origin JSON write is allowed; a cross-site one is refused", async () => {
    expect(await decide(write({ "Sec-Fetch-Site": "same-origin" }), "serverFn")).toBe(200);
    expect(await decide(write({ "Sec-Fetch-Site": "cross-site" }), "serverFn")).toBe(403);
    expect(await decide(write({ Origin: "https://evil.example" }), "serverFn")).toBe(403);
  });

  test("a cross-site sign-out post is refused", async () => {
    const signOut = (headers: Record<string, string>) => new Request(`${ORIGIN}/sign-out`, { method: "POST", headers, body: "" });
    expect(await decide(signOut({ "Sec-Fetch-Site": "same-origin" }), "router")).toBe(200);
    expect(await decide(signOut({ "Sec-Fetch-Site": "cross-site" }), "router")).toBe(403);
  });
});

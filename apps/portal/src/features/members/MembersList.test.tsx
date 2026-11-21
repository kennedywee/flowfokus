import { describe, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The list needs a router and the organization only for links and permissions.
mock.module("@tanstack/react-router", () => ({
  Link: ({ children, className, ...rest }: { children?: unknown; className?: string }) => createElement("a", { className, "data-link": JSON.stringify(rest) }, children as never),
  useNavigate: () => () => undefined,
}));
mock.module("../../lib/organization", () => ({
  useOrganization: () => ({ slug: "chainsaw", timezone: "Asia/Kuala_Lumpur" }),
  useCan: () => () => true,
}));
mock.module("../../lib/shortcuts", () => ({ useShortcut: () => undefined }));

const { MembersList } = await import("./MembersList");

const member = (n: number) => ({
  id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
  name: `Member ${String(n).padStart(2, "0")}`,
  email: `member${n}@example.com`,
  created_at: "2026-11-20T10:00:00Z",
});
const rows = (count: number) => Array.from({ length: count }, (_, index) => member(index + 1));
const render = (members: Parameters<typeof MembersList>[0]["members"], q?: string) => renderToStaticMarkup(createElement(MembersList, { members, q }));

describe("MembersList", () => {
  test("shows the count, rows, and the range, and has no Filter button", () => {
    const html = render({ ok: true, data: rows(3) });
    expect(html).toContain('<dt class="hero__label">members</dt><dd class="hero__value">3</dd>');
    expect(html).toContain("Member 01");
    expect(html).toContain("member1@example.com");
    expect(html).toContain("1–3 of 3 members");
    expect(html).not.toContain(">Filter<");
    expect(html).toContain("Display");
    expect(html).toContain('placeholder="Search name or email"');
  });

  test("pages the rows 50 at a time", () => {
    const html = render({ ok: true, data: rows(51) });
    expect(html).toContain("1–50 of 51 members");
    expect(html).toContain("Member 50");
    expect(html).not.toContain("Member 51");
    expect(html).toContain('aria-label="Page 2"');
  });

  test("at Rails' 200 limit, the count and range say more may exist", () => {
    const html = render({ ok: true, data: rows(200) });
    expect(html).toContain('<dd class="hero__value">200+</dd>');
    expect(html).toContain("1–50 of 200 members shown");
  });

  test("a search hides the count of all members", () => {
    expect(render({ ok: true, data: rows(2) }, "member")).not.toContain("hero__stat");
  });

  test("says so when there are no members, and when a search matches none", () => {
    expect(render({ ok: true, data: [] })).toContain("No members yet");
    const none = render({ ok: true, data: [] }, "zzz");
    expect(none).toContain("No members match “zzz”");
    expect(none).toContain("Clear search");
    expect(none).not.toContain("No members yet");
  });

  test("a failed load shows the failure, and not an empty list", () => {
    const html = render({ ok: false, error: { status: 503, code: "api_unreachable", message: "Rails did not answer." } });
    expect(html).toContain("Members did not load");
    expect(html).not.toContain("No members yet");
  });
});

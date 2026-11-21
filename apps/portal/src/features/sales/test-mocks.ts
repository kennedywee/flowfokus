import { mock } from "bun:test";
import { createElement } from "react";
import type { Permission } from "@flowfokus/api";

/*
 * Mocks the sales screens' tests share. Bun mocks a module for the whole test
 * run, so both tests import this file and set `state.allowed` per test.
 * The router, the organization, and the shortcuts are needed only for links,
 * permissions, and keys; the server functions need the Worker runtime and are
 * never called.
 */
export const state: { allowed: Permission[] } = { allowed: [] };

mock.module("@tanstack/react-router", () => ({
  Link: ({ children, className, ...rest }: { children?: unknown; className?: string }) => createElement("a", { className, "data-link": JSON.stringify(rest) }, children as never),
  useNavigate: () => () => undefined,
  useRouter: () => ({ invalidate: () => undefined }),
  useBlocker: () => ({ status: "idle" }),
}));
mock.module("../../lib/organization", () => ({
  useOrganization: () => ({ slug: "chainsaw", timezone: "Asia/Kuala_Lumpur", currency: "MYR", locations: [] }),
  useCan: () => (permission: Permission) => state.allowed.includes(permission),
  useLocationName: () => () => "Bangsar",
  useDeskLocation: () => null,
}));
mock.module("../../lib/shortcuts", () => ({ useShortcut: () => undefined, useModKeyLabel: () => "Ctrl" }));
const never = () => Promise.reject(new Error("not called"));
mock.module("../../lib/staff.functions", () => ({ fulfillSale: never, recordPayment: never, recordRefund: never, revokeSale: never, voidSale: never, createSale: never }));
mock.module("../../components/Toast", () => ({ useToast: () => ({ show: () => undefined }) }));

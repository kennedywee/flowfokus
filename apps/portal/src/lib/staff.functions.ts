/**
 * Server functions for the staff portal. Each one maps to one fixed `/staff/*`
 * endpoint. The browser can call only these; it cannot choose an upstream path,
 * a token, or any `Flowfokus-*` header.
 *
 * Reads use GET. Writes use POST with a JSON body, checked by the request
 * middleware and the CSRF middleware in `src/start.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Schemas } from "@flowfokus/api";
import { toPublicAccess, type PublicAccess } from "../server/access";
import { callStaff, currentStaffAccess, signedInUser, staffMemberships } from "../server/rails";
import type { Result } from "./result";
import {
  createCheckInInput,
  createMemberInput,
  createSaleInput,
  fulfillInput,
  idInput,
  memberSearchInput,
  optionalMemberInput,
  recordPaymentInput,
  slugInput,
  type CreateCheckInInput,
  type CreateMemberInput,
  type CreateSaleInput,
  type FulfillInput,
  type IdInput,
  type MemberSearchInput,
  type OptionalMemberInput,
  type RecordPaymentInput,
  type SlugInput,
} from "./validate";

/** How staff access works here, and who is signed in. Never holds a token. */
export interface PortalSession {
  access: PublicAccess;
  /** The signed-in WorkOS user. Null in demo mode, and when signed out. */
  user: { name: string; email: string } | null;
}

export const getAccess = createServerFn({ method: "GET" }).handler(async (): Promise<PortalSession> => {
  const access = toPublicAccess(currentStaffAccess());
  return { access, user: access.kind === "workos" ? signedInUser() : null };
});

/** An organization the signed-in user can open. No WorkOS IDs reach the browser. */
export interface StaffOrganizationChoice {
  slug: string;
  name: string;
  role: string;
}

export const listMyOrganizations = createServerFn({ method: "GET" }).handler(
  async (): Promise<Result<StaffOrganizationChoice[]>> => {
    const result = await staffMemberships();
    if (!result.ok) return result;
    return { ok: true, data: result.data.map(({ slug, name, role }) => ({ slug, name, role })) };
  },
);

export const getStaffOrganization = createServerFn({ method: "GET" })
  .validator((input: SlugInput) => slugInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["StaffOrganization"]>> =>
      callStaff(data.slug, (api) => api.GET("/staff/organization")),
  );

export const getOverview = createServerFn({ method: "GET" })
  .validator((input: SlugInput) => slugInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["StaffOverview"]>> =>
      callStaff(data.slug, (api) => api.GET("/staff/overview")),
  );

export const listMembers = createServerFn({ method: "GET" })
  .validator((input: MemberSearchInput) => memberSearchInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Member"][]>> =>
      callStaff(data.slug, (api) =>
        api.GET("/staff/members", { params: { query: data.q ? { q: data.q } : {} } }),
      ),
  );

export const createMember = createServerFn({ method: "POST" })
  .validator((input: CreateMemberInput) => createMemberInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Member"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/members", { body: { name: data.name, email: data.email } }),
      ),
  );

export interface MemberRecord {
  member: Schemas["MemberDetail"];
  sales: Schemas["Sale"][];
  checkIns: Schemas["CheckIn"][];
}

/** One member with their sales and recent check-ins, fetched in parallel. */
export const getMemberRecord = createServerFn({ method: "GET" })
  .validator((input: IdInput) => idInput(input))
  .handler(async ({ data }): Promise<Result<MemberRecord>> => {
    const path = { params: { path: { id: data.id } } };
    const byMember = { params: { query: { member_id: data.id } } };
    const [member, sales, checkIns] = await Promise.all([
      callStaff(data.slug, (api) => api.GET("/staff/members/{id}", path)),
      callStaff(data.slug, (api) => api.GET("/staff/sales", byMember)),
      callStaff(data.slug, (api) => api.GET("/staff/check_ins", byMember)),
    ]);
    if (!member.ok) return member;
    if (!sales.ok) return sales;
    if (!checkIns.ok) return checkIns;
    return { ok: true, data: { member: member.data, sales: sales.data, checkIns: checkIns.data } };
  });

export const listProducts = createServerFn({ method: "GET" })
  .validator((input: SlugInput) => slugInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["StaffProduct"][]>> =>
      callStaff(data.slug, (api) => api.GET("/staff/products")),
  );

export const listSales = createServerFn({ method: "GET" })
  .validator((input: OptionalMemberInput) => optionalMemberInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"][]>> =>
      callStaff(data.slug, (api) =>
        api.GET("/staff/sales", {
          params: { query: data.memberId ? { member_id: data.memberId } : {} },
        }),
      ),
  );

export const getSale = createServerFn({ method: "GET" })
  .validator((input: IdInput) => idInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) => api.GET("/staff/sales/{id}", { params: { path: { id: data.id } } })),
  );

export const createSale = createServerFn({ method: "POST" })
  .validator((input: CreateSaleInput) => createSaleInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/sales", {
          params: { header: { "Idempotency-Key": data.idempotencyKey } },
          body: { member_id: data.member_id, price_id: data.price_id, location_id: data.location_id },
        }),
      ),
  );

export const recordPayment = createServerFn({ method: "POST" })
  .validator((input: RecordPaymentInput) => recordPaymentInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/sales/{id}/payments", {
          params: { path: { id: data.saleId }, header: { "Idempotency-Key": data.idempotencyKey } },
          body: { amount_minor: data.amount_minor, method: data.method, reference: data.reference ?? null },
        }),
      ),
  );

export const fulfillSale = createServerFn({ method: "POST" })
  .validator((input: FulfillInput) => fulfillInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/sales/{id}/fulfill", { params: { path: { id: data.saleId } } }),
      ),
  );

export const listCheckIns = createServerFn({ method: "GET" })
  .validator((input: OptionalMemberInput) => optionalMemberInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["CheckIn"][]>> =>
      callStaff(data.slug, (api) =>
        api.GET("/staff/check_ins", {
          params: { query: data.memberId ? { member_id: data.memberId } : {} },
        }),
      ),
  );

export const createCheckIn = createServerFn({ method: "POST" })
  .validator((input: CreateCheckInInput) => createCheckInInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["CheckIn"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/check_ins", {
          params: { header: { "Idempotency-Key": data.idempotencyKey } },
          body: { member_id: data.member_id, location_id: data.location_id },
        }),
      ),
  );

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
import { callStaff, currentOrganizationId, currentStaffAccess, signedInUser, staffMemberships } from "../server/rails";
import type { Result } from "./result";
import { toOrganizationChoices, type StaffOrganizationChoice } from "./start";
import {
  invitationIdInput,
  inviteInput,
  memberRoleInput,
  type InvitationIdInput,
  type InviteInput,
  type MemberRoleInput,
  locationInput,
  updateOrganizationInput,
  type LocationInput,
  type UpdateOrganizationInput,
  reasonInput,
  refundInput,
  type ReasonInput,
  type RefundInput,
  renewInput,
  type RenewInput,
  createPriceInput,
  createProductInput,
  updatePriceInput,
  updateProductInput,
  type CreatePriceInput,
  type CreateProductInput,
  type UpdatePriceInput,
  type UpdateProductInput,
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

export type { StaffOrganizationChoice };

export const listMyOrganizations = createServerFn({ method: "GET" }).handler(
  async (): Promise<Result<StaffOrganizationChoice[]>> => {
    const result = await staffMemberships();
    if (!result.ok) return result;
    // Read after the call: a refresh inside it can change the session.
    return { ok: true, data: toOrganizationChoices(result.data, currentOrganizationId()) };
  },
);

export const getStaffOrganization = createServerFn({ method: "GET" })
  .validator((input: SlugInput) => slugInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["StaffOrganization"]>> =>
      callStaff(data.slug, (api) => api.GET("/staff/organization")),
  );

export const updateOrganization = createServerFn({ method: "POST" })
  .validator((input: UpdateOrganizationInput) => updateOrganizationInput(input))
  .handler(async ({ data }): Promise<Result<Schemas["StaffOrganization"]>> => {
    const { slug, ...body } = data;
    return callStaff(slug, (api) => api.PATCH("/staff/organization", { body }));
  });

/** Adds a location, or changes one when `id` is set. */
export const saveLocation = createServerFn({ method: "POST" })
  .validator((input: LocationInput) => locationInput(input))
  .handler(async ({ data }): Promise<Result<Schemas["Location"]>> => {
    const { slug, id, ...body } = data;
    return id
      ? callStaff(slug, (api) => api.PATCH("/staff/locations/{id}", { params: { path: { id } }, body }))
      : callStaff(slug, (api) => api.POST("/staff/locations", { body }));
  });

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

export const createProduct = createServerFn({ method: "POST" })
  .validator((input: CreateProductInput) => createProductInput(input))
  .handler(async ({ data }): Promise<Result<Schemas["StaffProduct"]>> => {
    const { slug, ...body } = data;
    return callStaff(slug, (api) => api.POST("/staff/products", { body }));
  });

export const updateProduct = createServerFn({ method: "POST" })
  .validator((input: UpdateProductInput) => updateProductInput(input))
  .handler(async ({ data }): Promise<Result<Schemas["StaffProduct"]>> => {
    const { slug, id, ...body } = data;
    return callStaff(slug, (api) => api.PATCH("/staff/products/{id}", { params: { path: { id } }, body }));
  });

export const createPrice = createServerFn({ method: "POST" })
  .validator((input: CreatePriceInput) => createPriceInput(input))
  .handler(async ({ data }): Promise<Result<Schemas["StaffProduct"]>> => {
    const { slug, id, ...body } = data;
    return callStaff(slug, (api) => api.POST("/staff/products/{id}/prices", { params: { path: { id } }, body }));
  });

export const updatePrice = createServerFn({ method: "POST" })
  .validator((input: UpdatePriceInput) => updatePriceInput(input))
  .handler(async ({ data }): Promise<Result<Schemas["StaffProduct"]>> => {
    const { slug, id, ...body } = data;
    return callStaff(slug, (api) => api.PATCH("/staff/prices/{id}", { params: { path: { id } }, body }));
  });

export const archivePrice = createServerFn({ method: "POST" })
  .validator((input: IdInput) => idInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["StaffProduct"]>> =>
      callStaff(data.slug, (api) => api.POST("/staff/prices/{id}/archive", { params: { path: { id: data.id } } })),
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

export const renewMembership = createServerFn({ method: "POST" })
  .validator((input: RenewInput) => renewInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/members/{id}/renewals", {
          params: { path: { id: data.memberId }, header: { "Idempotency-Key": data.idempotencyKey } },
          body: { location_id: data.location_id },
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
        api.POST("/staff/sales/{id}/fulfill", {
          params: { path: { id: data.saleId } },
          ...(data.early_reason ? { body: { early_reason: data.early_reason } } : {}),
        }),
      ),
  );

export const recordRefund = createServerFn({ method: "POST" })
  .validator((input: RefundInput) => refundInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/sales/{id}/refunds", {
          params: { path: { id: data.saleId }, header: { "Idempotency-Key": data.idempotencyKey } },
          body: { payment_id: data.payment_id, amount_minor: data.amount_minor, reason: data.reason },
        }),
      ),
  );

export const voidSale = createServerFn({ method: "POST" })
  .validator((input: ReasonInput) => reasonInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/sales/{id}/void", { params: { path: { id: data.saleId } }, body: { reason: data.reason } }),
      ),
  );

export const revokeSale = createServerFn({ method: "POST" })
  .validator((input: ReasonInput) => reasonInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Sale"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/sales/{id}/revoke", { params: { path: { id: data.saleId } }, body: { reason: data.reason } }),
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
          body: {
            member_id: data.member_id,
            location_id: data.location_id,
            ...(data.override_reason ? { override_reason: data.override_reason } : {}),
          },
        }),
      ),
  );

export const getTeam = createServerFn({ method: "GET" })
  .validator((input: SlugInput) => slugInput(input))
  .handler(async ({ data }): Promise<Result<Schemas["Team"]>> => callStaff(data.slug, (api) => api.GET("/staff/team")));

export const inviteStaff = createServerFn({ method: "POST" })
  .validator((input: InviteInput) => inviteInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Team"]>> =>
      callStaff(data.slug, (api) => api.POST("/staff/team/invitations", { body: { email: data.email, role: data.role } })),
  );

export const revokeInvitation = createServerFn({ method: "POST" })
  .validator((input: InvitationIdInput) => invitationIdInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Team"]>> =>
      callStaff(data.slug, (api) =>
        api.POST("/staff/team/invitations/{invitation_id}/revoke", { params: { path: { invitation_id: data.invitationId } } }),
      ),
  );

export const changeStaffRole = createServerFn({ method: "POST" })
  .validator((input: MemberRoleInput) => memberRoleInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Team"]>> =>
      callStaff(data.slug, (api) =>
        api.PATCH("/staff/team/members/{id}", { params: { path: { id: data.id } }, body: { role: data.role } }),
      ),
  );

export const removeStaff = createServerFn({ method: "POST" })
  .validator((input: IdInput) => idInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["Team"]>> =>
      callStaff(data.slug, (api) => api.DELETE("/staff/team/members/{id}", { params: { path: { id: data.id } } })),
  );

export const createLinkCode = createServerFn({ method: "POST" })
  .validator((input: IdInput) => idInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["MemberLinkCode"]>> =>
      callStaff(data.slug, (api) => api.POST("/staff/members/{id}/link", { params: { path: { id: data.id } } })),
  );

export const unlinkMember = createServerFn({ method: "POST" })
  .validator((input: IdInput) => idInput(input))
  .handler(
    async ({ data }): Promise<Result<Schemas["MemberDetail"]>> =>
      callStaff(data.slug, (api) => api.DELETE("/staff/members/{id}/link", { params: { path: { id: data.id } } })),
  );

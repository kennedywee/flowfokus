import { expect, spyOn, test } from "bun:test";
import {
  createCheckIn,
  createMember,
  createSale,
  fulfillSale,
  getMemberRecord,
  getOverview,
  getSale,
  getStaffOrganization,
  listMembers,
  listProducts,
  recordPayment,
} from "./staff.mock";
import { createIdempotencyKey } from "./idempotency";

test("the frontend sample workflow works without HTTP and shares changes across screens", async () => {
  const network = spyOn(globalThis, "fetch").mockRejectedValue(new Error("Preview must not use HTTP"));
  try {
    const slug = "chainsaw";
    const organization = await getStaffOrganization({ data: { slug } });
    const products = await listProducts({ data: { slug } });
    if (!organization.ok || !products.ok) throw new Error("Sample fixtures missing");
    const location_id = organization.data.locations[0]!.id;
    const member = await createMember({ data: { slug, name: "Preview Member", email: "preview.member@example.com" } });
    if (!member.ok) throw new Error("Sample member creation failed");
    const member_id = member.data.id;
    const search = await listMembers({ data: { slug, q: "preview.member" } });
    expect(search.ok && search.data.map((member) => member.id)).toEqual([member_id]);
    const denied = await createCheckIn({
      data: { slug, member_id, location_id, idempotencyKey: createIdempotencyKey() },
    });
    expect(denied.ok && denied.data.result).toBe("denied");
    const key = createIdempotencyKey();
    const input = { slug, member_id, location_id, price_id: products.data[0]!.prices[0]!.id, idempotencyKey: key };
    const sale = await createSale({ data: input });
    if (!sale.ok) throw new Error("Sample sale creation failed");
    const replay = await createSale({ data: input });
    expect(replay.ok && replay.data.id).toBe(sale.data.id);
    const saleId = sale.data.id;
    const early = await fulfillSale({ data: { slug, saleId } });
    expect(early.ok).toBe(false);
    const paid = await recordPayment({
      data: {
        slug,
        saleId,
        amount_minor: sale.data.total_minor,
        method: "cash",
        idempotencyKey: createIdempotencyKey(),
      },
    });
    expect(paid.ok && paid.data.balance_minor).toBe(0);
    const delivered = await fulfillSale({ data: { slug, saleId } });
    expect(delivered.ok && delivered.data.fulfilled).toBe(true);
    const visit = await createCheckIn({
      data: { slug, member_id, location_id, idempotencyKey: createIdempotencyKey() },
    });
    expect(visit.ok && visit.data.result).toBe("granted");
    const record = await getMemberRecord({ data: { slug, id: member_id } });
    expect(record.ok && record.data.sales.length).toBe(1);
    expect(record.ok && record.data.checkIns.length).toBe(2);
    expect(record.ok && record.data.member.current_period).toBeTruthy();
    const overview = await getOverview({ data: { slug } });
    expect(overview.ok && overview.data.member_count).toBe(7);
    const otherOrganization = await getSale({ data: { slug: "ironworks", id: saleId } });
    expect(otherOrganization.ok).toBe(false);
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});

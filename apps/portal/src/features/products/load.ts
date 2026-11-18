import type { Schemas } from "@flowfokus/api";
import type { Result } from "../../lib/result";
import { listProducts, listPrograms } from "../../lib/staff.functions";
import { isUuid } from "../../lib/validate";

export type LoadedProduct = { product: Result<Schemas["StaffProduct"]>; programs: Schemas["ProgramListItem"][] };

/**
 * One product, found in the Rails product list (Rails has no single-product
 * read). Tickets are left out: they live on their program page. Programs
 * name the programs a benefit books; without programs:read the list is empty.
 */
export async function loadProduct(slug: string, id: string): Promise<LoadedProduct> {
  const notFound = { ok: false as const, error: { status: 404, code: "not_found" as const, message: "Product not found" } };
  if (!isUuid(id)) return { product: notFound, programs: [] };
  const [products, programs] = await Promise.all([listProducts({ data: { slug } }), listPrograms({ data: { slug } })]);
  const found = products.ok ? products.data.find((product) => product.id === id && product.kind !== "ticket") : undefined;
  return {
    product: !products.ok ? products : found ? { ok: true, data: found } : notFound,
    programs: programs.ok ? programs.data : [],
  };
}

/** The breadcrumb ends with the product's name. */
export function productCrumb(data: unknown): string | undefined {
  const loaded = data as LoadedProduct | undefined;
  return loaded?.product.ok ? loaded.product.data.name : undefined;
}

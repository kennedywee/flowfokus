import type { Schemas } from "@flowfokus/api";
import type { Failure, Result } from "../../lib/result";
import type { PriceSpec } from "./facts";

type Product = Schemas["StaffProduct"];
type Price = Schemas["Price"];

/** The three Rails calls a price change uses. Each returns the whole product. */
export interface PriceApi {
  /** The product as Rails has it now. */
  load: () => Promise<Result<Product>>;
  create: (spec: PriceSpec) => Promise<Result<Product>>;
  archive: (priceId: string) => Promise<Result<Product>>;
}

export type PriceChangeResult =
  | { ok: true; product: Product; newPrice: Price }
  /** Nothing changed: no new price exists. */
  | { ok: false; stage: "create"; error: Failure }
  /** The new price is on sale, and the old price is still on sale too. */
  | { ok: false; stage: "archive"; error: Failure; product: Product; newPrice: Price };

/**
 * A price this change created: on sale, not one of the prices staff saw
 * when the form opened, with the same amount and length.
 */
export function findCreated(product: Product, known: ReadonlySet<string>, spec: PriceSpec): Price | undefined {
  return product.prices.find(
    (price) =>
      !known.has(price.id) &&
      !price.archived_at &&
      price.available &&
      price.amount_minor === spec.amount_minor &&
      price.duration_days === spec.duration_days,
  );
}

/**
 * Replaces a product's price, because Rails never changes a price a sale may use.
 *
 * 1. Load the product. A new price an earlier try made is reused, so a retry
 *    never adds a second one, even when the first answer was lost.
 * 2. Otherwise create the new price. It goes on sale at once.
 * 3. Archive the old price. Members who bought it keep it.
 *
 * The new price exists before the old one goes, so a failure never leaves the
 * product with nothing on sale. If the archive fails, both prices are on sale
 * and the caller says so; running this again only retries the archive.
 */
export async function replacePrice(
  api: PriceApi,
  input: { known: ReadonlySet<string>; oldPriceId: string | null; spec: PriceSpec },
): Promise<PriceChangeResult> {
  const loaded = await api.load();
  if (!loaded.ok) return { ok: false, stage: "create", error: loaded.error };

  let product = loaded.data;
  let newPrice = findCreated(product, input.known, input.spec);
  if (!newPrice) {
    const created = await api.create(input.spec);
    if (!created.ok) return { ok: false, stage: "create", error: created.error };
    product = created.data;
    newPrice = findCreated(product, input.known, input.spec);
    if (!newPrice) {
      return {
        ok: false,
        stage: "create",
        error: { status: 0, code: "unexpected_response", message: "The new price did not appear. Reload the page to check the product." },
      };
    }
  }

  const old = input.oldPriceId ? product.prices.find((price) => price.id === input.oldPriceId) : undefined;
  if (old && !old.archived_at) {
    const archived = await api.archive(old.id);
    if (!archived.ok) return { ok: false, stage: "archive", error: archived.error, product, newPrice };
    product = archived.data;
  }
  return { ok: true, product, newPrice };
}

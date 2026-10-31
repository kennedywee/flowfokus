/**
 * Input checks for server functions. They reject malformed input before it
 * reaches Rails. They do not hold business rules: Rails validates every write.
 */
import type { Schemas } from "@flowfokus/api";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_METHODS: ReadonlyArray<Schemas["PaymentMethod"]> = ["cash", "bank_transfer"];

export class InputError extends Error {
  override name = "InputError";
}

export function isSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG.test(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InputError("Expected an object");
  }
  return value as Record<string, unknown>;
}

function slugField(input: Record<string, unknown>): string {
  if (!isSlug(input.slug)) throw new InputError("Invalid organization");
  return input.slug;
}

function uuidField(input: Record<string, unknown>, name: string): string {
  const value = input[name];
  if (!isUuid(value)) throw new InputError(`Invalid ${name}`);
  return value.toLowerCase();
}

function textField(input: Record<string, unknown>, name: string, max: number): string {
  const value = input[name];
  if (typeof value !== "string" || value.length > max) throw new InputError(`Invalid ${name}`);
  return value;
}

export interface SlugInput {
  slug: string;
}

export function slugInput(value: unknown): SlugInput {
  return { slug: slugField(record(value)) };
}

export interface DeskLocationInput extends SlugInput {
  location_id: string;
}

/** The desk location is a display preference, not a write to Rails. */
export function deskLocationInput(value: unknown): DeskLocationInput {
  const input = record(value);
  return { slug: slugField(input), location_id: uuidField(input, "location_id") };
}

/** The colour theme. `system` follows the operating system. */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as ReadonlyArray<string>).includes(value);
}

export interface ThemeInput {
  theme: Theme;
}

/** The theme is a display preference, not a write to Rails. */
export function themeInput(value: unknown): ThemeInput {
  const input = record(value);
  if (!isTheme(input.theme)) throw new InputError("Invalid theme");
  return { theme: input.theme };
}

export interface IdInput extends SlugInput {
  id: string;
}

export function idInput(value: unknown): IdInput {
  const input = record(value);
  return { slug: slugField(input), id: uuidField(input, "id") };
}

export interface MemberSearchInput extends SlugInput {
  q?: string;
}

export function memberSearchInput(value: unknown): MemberSearchInput {
  const input = record(value);
  const q = input.q === undefined ? "" : textField(input, "q", 200).trim();
  return q ? { slug: slugField(input), q } : { slug: slugField(input) };
}

export interface OptionalMemberInput extends SlugInput {
  memberId?: string;
}

export function optionalMemberInput(value: unknown): OptionalMemberInput {
  const input = record(value);
  const slug = slugField(input);
  return input.memberId === undefined ? { slug } : { slug, memberId: uuidField(input, "memberId") };
}

/** Sent by the browser for writes that Rails deduplicates. */
interface IdempotentInput extends SlugInput {
  idempotencyKey: string;
}

function idempotencyKeyField(input: Record<string, unknown>): string {
  return uuidField(input, "idempotencyKey");
}

export type CreateMemberInput = SlugInput & Schemas["MemberInput"];

export function createMemberInput(value: unknown): CreateMemberInput {
  const input = record(value);
  // Length limits match the contract. Rails checks format and uniqueness.
  return {
    slug: slugField(input),
    name: textField(input, "name", 200),
    email: textField(input, "email", 320),
  };
}

export type CreateSaleInput = IdempotentInput & Schemas["SaleInput"];

export function createSaleInput(value: unknown): CreateSaleInput {
  const input = record(value);
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    member_id: uuidField(input, "member_id"),
    price_id: uuidField(input, "price_id"),
    location_id: uuidField(input, "location_id"),
  };
}

export type RecordPaymentInput = IdempotentInput & { saleId: string } & Schemas["PaymentInput"];

export function recordPaymentInput(value: unknown): RecordPaymentInput {
  const input = record(value);
  const amount = input.amount_minor;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount)) {
    throw new InputError("Invalid amount_minor");
  }
  const method = input.method;
  if (!PAYMENT_METHODS.includes(method as Schemas["PaymentMethod"])) {
    throw new InputError("Invalid method");
  }
  const reference =
    input.reference === undefined || input.reference === null || input.reference === ""
      ? null
      : textField(input, "reference", 200);
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    saleId: uuidField(input, "saleId"),
    amount_minor: amount,
    method: method as Schemas["PaymentMethod"],
    reference,
  };
}

export interface FulfillInput extends SlugInput {
  saleId: string;
}

export function fulfillInput(value: unknown): FulfillInput {
  const input = record(value);
  return { slug: slugField(input), saleId: uuidField(input, "saleId") };
}

export type CreateCheckInInput = IdempotentInput & Schemas["CheckInInput"];

export function createCheckInInput(value: unknown): CreateCheckInInput {
  const input = record(value);
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    member_id: uuidField(input, "member_id"),
    location_id: uuidField(input, "location_id"),
  };
}

function optionalBoolean(input: Record<string, unknown>, name: string): boolean | undefined {
  const value = input[name];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new InputError(`Invalid ${name}`);
  return value;
}

function wholeNumber(input: Record<string, unknown>, name: string, min: number, max: number): number {
  const value = input[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new InputError(`Invalid ${name}`);
  }
  return value;
}

function benefitsField(input: Record<string, unknown>): Schemas["BenefitInput"][] {
  const list = input.benefits;
  if (!Array.isArray(list) || list.length > 10) throw new InputError("Invalid benefits");
  return list.map((item) => {
    const benefit = record(item);
    const limit = benefit.usage_limit;
    if (limit !== null && limit !== undefined && (typeof limit !== "number" || !Number.isSafeInteger(limit))) {
      throw new InputError("Invalid usage_limit");
    }
    const location = benefit.location_id;
    if (location !== null && location !== undefined && !isUuid(location)) throw new InputError("Invalid location_id");
    return {
      name: textField(benefit, "name", 200),
      usage_limit: typeof limit === "number" ? limit : null,
      location_id: typeof location === "string" ? location.toLowerCase() : null,
    };
  });
}

function descriptionField(input: Record<string, unknown>): string | null {
  const value = input.description;
  if (value === null || value === "") return null;
  return textField(input, "description", 2000);
}

export type CreateProductInput = SlugInput & Schemas["ProductInput"];

export function createProductInput(value: unknown): CreateProductInput {
  const input = record(value);
  const published = optionalBoolean(input, "published");
  return {
    slug: slugField(input),
    name: textField(input, "name", 200),
    description: input.description === undefined ? null : descriptionField(input),
    ...(published === undefined ? {} : { published }),
    benefits: benefitsField(input),
  };
}

export type UpdateProductInput = IdInput & Schemas["ProductUpdate"];

/** Sends only the fields the form changed. */
export function updateProductInput(value: unknown): UpdateProductInput {
  const input = record(value);
  const published = optionalBoolean(input, "published");
  return {
    slug: slugField(input),
    id: uuidField(input, "id"),
    ...(input.name === undefined ? {} : { name: textField(input, "name", 200) }),
    ...(input.description === undefined ? {} : { description: descriptionField(input) }),
    ...(published === undefined ? {} : { published }),
    ...(input.benefits === undefined ? {} : { benefits: benefitsField(input) }),
  };
}

export type CreatePriceInput = IdInput & Schemas["PriceInput"];

export function createPriceInput(value: unknown): CreatePriceInput {
  const input = record(value);
  return {
    slug: slugField(input),
    id: uuidField(input, "id"),
    label: textField(input, "label", 200),
    amount_minor: wholeNumber(input, "amount_minor", 0, Number.MAX_SAFE_INTEGER),
    duration_days: wholeNumber(input, "duration_days", 1, 3660),
  };
}

export type UpdatePriceInput = IdInput & Schemas["PriceUpdate"];

export function updatePriceInput(value: unknown): UpdatePriceInput {
  const input = record(value);
  const available = optionalBoolean(input, "available");
  return {
    slug: slugField(input),
    id: uuidField(input, "id"),
    ...(input.label === undefined ? {} : { label: textField(input, "label", 200) }),
    ...(available === undefined ? {} : { available }),
  };
}

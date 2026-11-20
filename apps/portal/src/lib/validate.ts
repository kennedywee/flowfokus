/**
 * Input checks for server functions. They reject malformed input before it
 * reaches Rails. They do not hold business rules: Rails validates every write.
 */
import type { Schemas } from "@flowfokus/api";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_METHODS: ReadonlyArray<Schemas["ManualPaymentMethod"]> = ["cash", "bank_transfer"];

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

/** An optional text field. Empty, null, and missing all mean "no value". */
function optionalTextField(input: Record<string, unknown>, name: string, max: number): string | null {
  const value = input[name];
  return value === undefined || value === null || value === "" ? null : textField(input, name, max);
}

export type CreateMemberInput = SlugInput & Pick<Schemas["MemberInput"], "name" | "email" | "phone">;

export function createMemberInput(value: unknown): CreateMemberInput {
  const input = record(value);
  // Length limits match the contract. Rails checks format and uniqueness.
  return {
    slug: slugField(input),
    name: textField(input, "name", 200),
    email: textField(input, "email", 320),
    phone: optionalTextField(input, "phone", 32),
  };
}

/** Every field staff can change on a member. The edit form always sends them all. */
export type UpdateMemberInput = SlugInput & { id: string } & Required<Schemas["MemberUpdateInput"]>;

export function updateMemberInput(value: unknown): UpdateMemberInput {
  const input = record(value);
  const born = optionalTextField(input, "date_of_birth", 10);
  if (born !== null && !/^\d{4}-\d{2}-\d{2}$/.test(born)) throw new InputError("Invalid date_of_birth");
  return {
    slug: slugField(input),
    id: uuidField(input, "id"),
    name: textField(input, "name", 200),
    email: textField(input, "email", 320),
    phone: optionalTextField(input, "phone", 32),
    date_of_birth: born,
    emergency_contact_name: optionalTextField(input, "emergency_contact_name", 200),
    emergency_contact_phone: optionalTextField(input, "emergency_contact_phone", 32),
    note: optionalTextField(input, "note", 2000),
  };
}

export type CreateSaleInput = IdempotentInput & Omit<Schemas["SaleInput"], "quantity"> & { quantity?: number };

/** Who attends a spot: a member of this gym, or a guest by name. */
function attendeesField(input: Record<string, unknown>): Schemas["AttendeeInput"][] | undefined {
  if (input.attendees === undefined) return undefined;
  const list = input.attendees;
  if (!Array.isArray(list) || list.length < 1 || list.length > 10) throw new InputError("Invalid attendees");
  return list.map((item) => {
    const entry = record(item);
    if (entry.member_id !== undefined) return { member_id: uuidField(entry, "member_id") };
    const name = textField(entry, "guest_name", 200).trim();
    if (!name) throw new InputError("Invalid guest_name");
    const email = entry.guest_email === undefined || entry.guest_email === null || entry.guest_email === "" ? null : textField(entry, "guest_email", 320);
    return { guest_name: name, guest_email: email };
  });
}

export function createSaleInput(value: unknown): CreateSaleInput {
  const input = record(value);
  const attendees = attendeesField(input);
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    member_id: uuidField(input, "member_id"),
    price_id: uuidField(input, "price_id"),
    location_id: uuidField(input, "location_id"),
    ...(input.occurrence_id === undefined ? {} : { occurrence_id: uuidField(input, "occurrence_id") }),
    ...(input.quantity === undefined ? {} : { quantity: wholeNumber(input, "quantity", 1, 10) }),
    ...(attendees ? { attendees } : {}),
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
  if (!PAYMENT_METHODS.includes(method as Schemas["ManualPaymentMethod"])) {
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
    method: method as Schemas["ManualPaymentMethod"],
    reference,
  };
}

export interface FulfillInput extends SlugInput {
  saleId: string;
  /** Fulfills before full payment. Needs purchases:fulfill_unpaid. */
  early_reason?: string;
}

export function fulfillInput(value: unknown): FulfillInput {
  const input = record(value);
  const base = { slug: slugField(input), saleId: uuidField(input, "saleId") };
  if (input.early_reason === undefined) return base;
  const reason = textField(input, "early_reason", 500).trim();
  return reason ? { ...base, early_reason: reason } : base;
}

export type CreateCheckInInput = IdempotentInput & Schemas["CheckInInput"];

export function createCheckInInput(value: unknown): CreateCheckInInput {
  const input = record(value);
  const reason = input.override_reason === undefined ? "" : textField(input, "override_reason", 500).trim();
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    member_id: uuidField(input, "member_id"),
    location_id: uuidField(input, "location_id"),
    ...(reason ? { override_reason: reason } : {}),
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

const BENEFIT_KINDS: ReadonlyArray<Schemas["BenefitKind"]> = ["gym_access", "program_access"];
export const PROGRAM_KINDS: ReadonlyArray<Schemas["ProgramKind"]> = ["group_class", "event", "appointment"];

function isProgramKind(value: unknown): value is Schemas["ProgramKind"] {
  return typeof value === "string" && (PROGRAM_KINDS as ReadonlyArray<string>).includes(value);
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
    const kind = benefit.kind === undefined ? "gym_access" : benefit.kind;
    if (!BENEFIT_KINDS.includes(kind as Schemas["BenefitKind"])) throw new InputError("Invalid kind");
    const programs = benefit.program_ids === undefined ? [] : benefit.program_ids;
    if (!Array.isArray(programs) || programs.length > 50 || !programs.every(isUuid)) throw new InputError("Invalid program_ids");
    const programKind = benefit.program_kind ?? null;
    if (programKind !== null && !isProgramKind(programKind)) throw new InputError("Invalid program_kind");
    return {
      kind: kind as Schemas["BenefitKind"],
      name: textField(benefit, "name", 200),
      usage_limit: typeof limit === "number" ? limit : null,
      location_id: typeof location === "string" ? location.toLowerCase() : null,
      program_ids: (programs as string[]).map((id) => id.toLowerCase()),
      program_kind: programKind,
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
  const kind = input.kind ?? "membership";
  if (kind !== "membership" && kind !== "pass") throw new InputError("Invalid kind");
  return {
    slug: slugField(input),
    kind,
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

export type RenewInput = IdempotentInput & { memberId: string } & Schemas["RenewalInput"];

export function renewInput(value: unknown): RenewInput {
  const input = record(value);
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    memberId: uuidField(input, "memberId"),
    location_id: uuidField(input, "location_id"),
  };
}

export type RefundInput = IdempotentInput & { saleId: string } & Schemas["RefundInput"];

export function refundInput(value: unknown): RefundInput {
  const input = record(value);
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    saleId: uuidField(input, "saleId"),
    payment_id: uuidField(input, "payment_id"),
    amount_minor: wholeNumber(input, "amount_minor", 1, Number.MAX_SAFE_INTEGER),
    reason: textField(input, "reason", 500),
  };
}

export interface ReasonInput extends SlugInput {
  saleId: string;
  reason: string;
}

export function reasonInput(value: unknown): ReasonInput {
  const input = record(value);
  return { slug: slugField(input), saleId: uuidField(input, "saleId"), reason: textField(input, "reason", 500) };
}

export type UpdateOrganizationInput = SlugInput & Schemas["OrganizationUpdate"];

export function updateOrganizationInput(value: unknown): UpdateOrganizationInput {
  const input = record(value);
  const published = optionalBoolean(input, "published");
  return {
    slug: slugField(input),
    ...(input.timezone === undefined ? {} : { timezone: textField(input, "timezone", 64) }),
    ...(published === undefined ? {} : { published }),
  };
}

export type LocationInput = SlugInput & { id?: string } & Schemas["LocationInput"];

export function locationInput(value: unknown): LocationInput {
  const input = record(value);
  return {
    slug: slugField(input),
    ...(input.id === undefined ? {} : { id: uuidField(input, "id") }),
    name: textField(input, "name", 100),
    address: input.address === null || input.address === undefined || input.address === "" ? null : textField(input, "address", 300),
  };
}

const INVITATION_ID = /^invitation_[A-Za-z0-9]{1,100}$/;

export interface InviteInput extends SlugInput {
  email: string;
  role: string;
}

function roleField(input: Record<string, unknown>): string {
  const role = input.role;
  if (typeof role !== "string" || !/^[a-z0-9][a-z0-9_:-]{0,99}$/.test(role)) throw new InputError("Invalid role");
  return role;
}

export function inviteInput(value: unknown): InviteInput {
  const input = record(value);
  return { slug: slugField(input), email: textField(input, "email", 320), role: roleField(input) };
}

export interface InvitationIdInput extends SlugInput {
  invitationId: string;
}

export function invitationIdInput(value: unknown): InvitationIdInput {
  const input = record(value);
  if (typeof input.invitationId !== "string" || !INVITATION_ID.test(input.invitationId)) throw new InputError("Invalid invitation");
  return { slug: slugField(input), invitationId: input.invitationId };
}

export interface MemberRoleInput extends IdInput {
  role: string;
}

export function memberRoleInput(value: unknown): MemberRoleInput {
  const input = record(value);
  return { slug: slugField(input), id: uuidField(input, "id"), role: roleField(input) };
}

// Programs, the schedule, and bookings.

function optionalText(input: Record<string, unknown>, name: string, max: number): string | null {
  const value = input[name];
  if (value === null || value === undefined || value === "") return null;
  return textField(input, name, max);
}

export type CreateProgramInput = IdempotentInput & Schemas["ProgramInput"];

export function createProgramInput(value: unknown): CreateProgramInput {
  const input = record(value);
  if (!isProgramKind(input.kind)) throw new InputError("Invalid kind");
  const published = optionalBoolean(input, "published");
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    name: textField(input, "name", 200),
    description: optionalText(input, "description", 2000),
    kind: input.kind,
    location_id: uuidField(input, "location_id"),
    capacity: wholeNumber(input, "capacity", 1, 10000),
    duration_minutes: wholeNumber(input, "duration_minutes", 1, 1440),
    host_name: optionalText(input, "host_name", 200),
    ...(published === undefined ? {} : { published }),
  };
}

export type UpdateProgramInput = IdInput & Schemas["ProgramUpdate"];

export function updateProgramInput(value: unknown): UpdateProgramInput {
  const input = record(value);
  const published = optionalBoolean(input, "published");
  return {
    slug: slugField(input),
    id: uuidField(input, "id"),
    ...(input.name === undefined ? {} : { name: textField(input, "name", 200) }),
    ...(input.description === undefined ? {} : { description: optionalText(input, "description", 2000) }),
    ...(input.location_id === undefined ? {} : { location_id: uuidField(input, "location_id") }),
    ...(input.capacity === undefined ? {} : { capacity: wholeNumber(input, "capacity", 1, 10000) }),
    ...(input.duration_minutes === undefined ? {} : { duration_minutes: wholeNumber(input, "duration_minutes", 1, 1440) }),
    ...(input.host_name === undefined ? {} : { host_name: optionalText(input, "host_name", 200) }),
    ...(published === undefined ? {} : { published }),
  };
}

export type ScheduleProgramInput = IdInput & Schemas["ScheduleInput"];

export function scheduleProgramInput(value: unknown): ScheduleProgramInput {
  const input = record(value);
  const date = textField(input, "date", 10);
  const time = textField(input, "time", 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new InputError("Invalid date");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new InputError("Invalid time");
  return { slug: slugField(input), id: uuidField(input, "id"), date, time, weeks: wholeNumber(input, "weeks", 1, 26) };
}

export type AddTicketInput = IdInput & { idempotencyKey: string } & Schemas["TicketInput"];

export function addTicketInput(value: unknown): AddTicketInput {
  const input = record(value);
  return {
    slug: slugField(input),
    idempotencyKey: idempotencyKeyField(input),
    id: uuidField(input, "id"),
    label: textField(input, "label", 200),
    amount_minor: wholeNumber(input, "amount_minor", 0, Number.MAX_SAFE_INTEGER),
  };
}

export interface ScheduleRangeInput extends SlugInput {
  from?: string;
  days?: number;
}

export function scheduleRangeInput(value: unknown): ScheduleRangeInput {
  const input = record(value);
  const slug = slugField(input);
  const from = input.from === undefined ? undefined : textField(input, "from", 10);
  if (from !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new InputError("Invalid from");
  const days = input.days === undefined ? undefined : wholeNumber(input, "days", 1, 62);
  return { slug, ...(from ? { from } : {}), ...(days ? { days } : {}) };
}

export interface BookingOptionsInput extends IdInput {
  memberId: string;
}

export function bookingOptionsInput(value: unknown): BookingOptionsInput {
  const input = record(value);
  return { slug: slugField(input), id: uuidField(input, "id"), memberId: uuidField(input, "memberId") };
}

export type CreateBookingInput = SlugInput & Schemas["StaffBookingInput"];

export function createBookingInput(value: unknown): CreateBookingInput {
  const input = record(value);
  return {
    slug: slugField(input),
    occurrence_id: uuidField(input, "occurrence_id"),
    member_id: uuidField(input, "member_id"),
    entitlement_id: uuidField(input, "entitlement_id"),
  };
}

export interface CancelBookingInput extends IdInput {
  reason: string;
  /** Give the use back. Rails defaults to true. */
  return_use?: boolean;
}

export function cancelBookingInput(value: unknown): CancelBookingInput {
  const input = record(value);
  const returnUse = optionalBoolean(input, "return_use");
  return {
    slug: slugField(input),
    id: uuidField(input, "id"),
    reason: textField(input, "reason", 500),
    ...(returnUse === undefined ? {} : { return_use: returnUse }),
  };
}

export interface CancelOccurrenceInput extends IdInput {
  reason: string;
}

export function cancelOccurrenceInput(value: unknown): CancelOccurrenceInput {
  const input = record(value);
  return { slug: slugField(input), id: uuidField(input, "id"), reason: textField(input, "reason", 500) };
}

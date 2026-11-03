import { createServerFn } from "@tanstack/react-start";
import {
  bookWithRight,
  cancelCheckout,
  cancelMemberBooking,
  currentSession,
  linkMember,
  loadAccountPage,
  loadBookingPage,
  loadCheckoutPage,
  loadSchedulePage,
  loadSitePage,
  payTestCheckout,
  startCheckout,
  type AccountPage,
  type BookingPage,
  type CheckoutPage,
  type LinkResult,
  type SchedulePage,
  type SitePage,
} from "../server/site";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value: unknown, name: string): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new Error(`Invalid ${name}`);
  return value.toLowerCase();
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected an object");
  return value as Record<string, unknown>;
}

/**
 * Public data for the gym named by the request host. It takes no input, so
 * the browser cannot ask for another gym or another API path.
 */
export const getSitePage = createServerFn({ method: "GET" }).handler(async (): Promise<SitePage> => loadSitePage());

/** Whether member sign-in is on here, and who is signed in. Never holds a token. */
export const getSession = createServerFn({ method: "GET" }).handler(async () => currentSession());

/** The signed-in member's own account on this gym host. */
export const getAccountPage = createServerFn({ method: "GET" }).handler(async (): Promise<AccountPage> => loadAccountPage());

/** Links the signed-in person to a member record. Takes only the code. */
export const submitLinkCode = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => {
    if (typeof input !== "object" || input === null || typeof input.code !== "string") throw new Error("Invalid code");
    const code = input.code.trim();
    if (!code || code.length > 40) throw new Error("Invalid code");
    return { code };
  })
  .handler(async ({ data }): Promise<LinkResult> => linkMember(data.code));

/** The public schedule for the next two weeks. */
export const getSchedulePage = createServerFn({ method: "GET" }).handler(async (): Promise<SchedulePage> => loadSchedulePage());

/** One time and the signed-in member's ways to book it. */
export const getBookingPage = createServerFn({ method: "GET" })
  .validator((input: { occurrenceId: string }) => ({ occurrenceId: uuid(object(input).occurrenceId, "time") }))
  .handler(async ({ data }): Promise<BookingPage> => loadBookingPage(data.occurrenceId));

/** Books a spot with a pass or membership the member holds. */
export const submitBooking = createServerFn({ method: "POST" })
  .validator((input: { occurrenceId: string; entitlementId: string }) => {
    const value = object(input);
    return { occurrenceId: uuid(value.occurrenceId, "time"), entitlementId: uuid(value.entitlementId, "pass") };
  })
  .handler(async ({ data }) => bookWithRight(data.occurrenceId, data.entitlementId));

/** Cancels one of the member's own bookings. */
export const submitBookingCancel = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => ({ bookingId: uuid(object(input).bookingId, "booking") }))
  .handler(async ({ data }) => cancelMemberBooking(data.bookingId));

/** Starts an online purchase: a ticket for one time, or a pass or membership. */
export const submitCheckout = createServerFn({ method: "POST" })
  .validator((input: { key: string; priceId: string; occurrenceId?: string }) => {
    const value = object(input);
    return {
      key: uuid(value.key, "key"),
      priceId: uuid(value.priceId, "price"),
      ...(value.occurrenceId === undefined ? {} : { occurrenceId: uuid(value.occurrenceId, "time") }),
    };
  })
  .handler(async ({ data }) => startCheckout(data));

export const getCheckoutPage = createServerFn({ method: "GET" })
  .validator((input: { checkoutId: string }) => ({ checkoutId: uuid(object(input).checkoutId, "checkout") }))
  .handler(async ({ data }): Promise<CheckoutPage> => loadCheckoutPage(data.checkoutId));

/** Pays with the local test provider. Rails refuses unless test payments are on. */
export const submitTestPayment = createServerFn({ method: "POST" })
  .validator((input: { checkoutId: string }) => ({ checkoutId: uuid(object(input).checkoutId, "checkout") }))
  .handler(async ({ data }) => payTestCheckout(data.checkoutId));

export const submitCheckoutCancel = createServerFn({ method: "POST" })
  .validator((input: { checkoutId: string }) => ({ checkoutId: uuid(object(input).checkoutId, "checkout") }))
  .handler(async ({ data }) => cancelCheckout(data.checkoutId));

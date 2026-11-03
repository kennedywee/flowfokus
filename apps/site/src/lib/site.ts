import { getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");

/** The gym for this host. Child routes render only when the root found one. */
export function useGym() {
  const { page } = rootRoute.useLoaderData();
  if (page.kind !== "gym") throw new Error("Gym is not loaded");
  return page;
}

/** Whether member sign-in is on here, and who is signed in. */
export function useSession() {
  return rootRoute.useLoaderData().session;
}

/** Dates and times in the gym's time zone. */
export function useDates() {
  const { organization } = useGym();
  const timeZone = organization.timezone;
  const date = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone });
  const dateTime = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone });
  const time = new Intl.DateTimeFormat("en-MY", { timeStyle: "short", timeZone });
  const day = new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long", timeZone });
  const key = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone });
  return {
    date: (iso: string) => date.format(new Date(iso)),
    dateTime: (iso: string) => dateTime.format(new Date(iso)),
    time: (iso: string) => time.format(new Date(iso)),
    day: (iso: string) => day.format(new Date(iso)),
    /** YYYY-MM-DD in the gym's time zone, for grouping by day. */
    dayKey: (iso: string) => key.format(new Date(iso)),
  };
}

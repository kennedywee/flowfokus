import { useOrganization } from "../../lib/organization";

/** "3 Nov", or "3 Nov 2025" outside the current year, in the organization's time zone. `now` fixes which year is current. */
export function useShortDate(now: number = Date.now()) {
  const { timezone } = useOrganization();
  const year = new Intl.DateTimeFormat("en-MY", { timeZone: timezone, year: "numeric" }).format(now);
  return (iso: string) => {
    const date = new Date(iso);
    const sameYear = new Intl.DateTimeFormat("en-MY", { timeZone: timezone, year: "numeric" }).format(date) === year;
    return new Intl.DateTimeFormat("en-MY", {
      timeZone: timezone,
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    }).format(date);
  };
}

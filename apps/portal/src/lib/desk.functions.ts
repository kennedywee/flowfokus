/**
 * The desk location: the branch this browser works at. It is a display
 * preference only. It sets the top bar label and the default location for
 * check-in and new sales. Rails still validates every location on each write.
 *
 * It lives in an httpOnly cookie per organization, so the server render
 * already knows it and no script can read it.
 */
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { deskLocationInput, isUuid, slugInput, type DeskLocationInput, type SlugInput } from "./validate";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Slugs are lowercase letters, numbers, and hyphens, so the name is always a valid cookie name. */
function cookieName(slug: string): string {
  return `flowfokus_desk_${slug}`;
}

export const getDeskLocation = createServerFn({ method: "GET" })
  .validator((input: SlugInput) => slugInput(input))
  .handler(async ({ data }): Promise<string | null> => {
    const value = getCookie(cookieName(data.slug));
    return isUuid(value) ? value.toLowerCase() : null;
  });

export const setDeskLocation = createServerFn({ method: "POST" })
  .validator((input: DeskLocationInput) => deskLocationInput(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    setCookie(cookieName(data.slug), data.location_id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: !import.meta.env.DEV,
      maxAge: ONE_YEAR,
    });
    return { ok: true };
  });

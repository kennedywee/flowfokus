/**
 * The colour theme: system, light, or dark. It is a display preference only.
 * `system` follows the operating system through CSS, with no script.
 *
 * It lives in an httpOnly cookie, so the server render already puts the right
 * class on <html> and the page never flashes the wrong theme.
 */
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { isTheme, themeInput, type Theme, type ThemeInput } from "./validate";

const COOKIE = "flowfokus_theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

export const getTheme = createServerFn({ method: "GET" }).handler(async (): Promise<Theme> => {
  const value = getCookie(COOKIE);
  return isTheme(value) ? value : "system";
});

export const setTheme = createServerFn({ method: "POST" })
  .validator((input: ThemeInput) => themeInput(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    setCookie(COOKIE, data.theme, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: !import.meta.env.DEV,
      maxAge: ONE_YEAR,
    });
    return { ok: true };
  });

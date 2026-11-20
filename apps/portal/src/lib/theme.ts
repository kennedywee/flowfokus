import type { Theme } from "./validate";

/** Sets the class that tokens.css reads. No class means follow the operating system. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
}

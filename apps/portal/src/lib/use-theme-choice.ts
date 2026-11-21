import { useState } from "react";
import { rootRouteId, useLoaderData, useRouter } from "@tanstack/react-router";
import { useToast } from "../components/Toast";
import { applyTheme } from "./theme";
import { setTheme } from "./theme.functions";
import type { Theme } from "./validate";

export const THEME_CHOICES: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * The theme and a way to change it. The account menu and Settings ›
 * Appearance share it. The new theme shows at once, while the cookie is saved.
 */
export function useThemeChoice() {
  const router = useRouter();
  const toast = useToast();
  const saved = useLoaderData({ from: rootRouteId });
  const [pending, setPending] = useState<Theme | null>(null);
  const theme = pending ?? saved;

  async function choose(next: Theme) {
    if (next === theme) return;
    setPending(next);
    applyTheme(next);
    try {
      await setTheme({ data: { theme: next } });
      await router.invalidate({ filter: (match) => match.routeId === rootRouteId });
    } catch {
      applyTheme(saved);
      toast.show({ tone: "error", title: "Theme not changed", body: "The choice was not saved. Try again." });
    } finally {
      setPending(null);
    }
  }

  return { theme, choose };
}

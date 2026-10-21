import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Local-only Worker variables taken from the shell, for `scripts/dev`.
 * Used by `vite dev` only. Production builds never read them.
 */
const LOCAL_VARS = ["API_BASE_URL", "SITE_BASE_DOMAINS", "WORKER_SECRET"] as const;

function localVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const name of LOCAL_VARS) {
    const value = process.env[name];
    if (value) vars[name] = value;
  }
  return vars;
}

export default defineConfig(({ command }) => ({
  // Gym sites run on <slug>.localhost in development.
  server: { port: 4002, strictPort: true, allowedHosts: [".localhost"] },
  preview: { port: 4002, strictPort: true },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      // Portal and site run side by side; a shared debugger port would clash.
      inspectorPort: false,
      ...(command === "serve" ? { config: { vars: localVars() } } : {}),
    }),
    tanstackStart(),
    viteReact(),
  ],
}));

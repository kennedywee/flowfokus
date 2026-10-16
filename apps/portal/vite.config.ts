import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Local-only Worker variables taken from the shell, for `scripts/dev`.
 * Used by `vite dev` only. Production builds never read them.
 */
const LOCAL_VARS = ["API_BASE_URL", "HYDRAFLOW_DEMO_MODE", "HYDRAFLOW_DEMO_TOKEN", "WORKER_SECRET"] as const;

function localVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const name of LOCAL_VARS) {
    const value = process.env[name];
    if (value) vars[name] = value;
  }
  return vars;
}

export default defineConfig(({ command }) => ({
  server: { port: 3001, strictPort: true },
  preview: { port: 3001, strictPort: true },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      ...(command === "serve" ? { config: { vars: localVars() } } : {}),
    }),
    tanstackStart(),
    viteReact(),
  ],
}));

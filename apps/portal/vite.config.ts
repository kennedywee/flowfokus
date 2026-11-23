import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Local-only Worker variables taken from the shell, for `scripts/dev`.
 * Used by `vite dev` only. Production builds never read them.
 */
const LOCAL_VARS = [
  "API_BASE_URL",
  "FLOWFOKUS_DEMO_MODE",
  "FLOWFOKUS_DEMO_TOKEN",
  "WORKER_SECRET",
  "WORKOS_CLIENT_ID",
  "WORKOS_API_KEY",
  "WORKOS_REDIRECT_URI",
  "WORKOS_COOKIE_PASSWORD",
  "WORKOS_API_HOSTNAME",
  "WORKOS_API_PORT",
  "WORKOS_API_HTTPS",
  "WORKOS_BROWSER_URL",
  "FLOWFOKUS_DEV_AUTH_HOSTS",
] as const;

function localVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const name of LOCAL_VARS) {
    const value = process.env[name];
    if (value) vars[name] = value;
  }
  return vars;
}

/**
 * Every `@ui-sdk/react` entry, read from the installed package.
 * Vite pre-bundles a new entry when a file first imports it. In the SSR
 * Worker, that mid-run pass leaves two copies of React, and pages fail with
 * "Cannot read properties of null (reading 'useContext')". Bundling all
 * entries at start means a new import never triggers that pass (issue #71).
 */
function uiSdkEntries(): string[] {
  const { exports } = createRequire(import.meta.url)("@ui-sdk/react/package.json") as { exports: Record<string, unknown> };
  return Object.keys(exports)
    .filter((path) => path !== "./package.json")
    .map((path) => `@ui-sdk/react/${path.slice(2)}`);
}

const UI_SDK_ENTRIES = uiSdkEntries();

export default defineConfig(({ command }) => ({
  // `.on.boat.dev`: Boat links (scripts/links). Vite refuses a host name it was not told about.
  server: { port: 4001, strictPort: true, allowedHosts: [".on.boat.dev"] },
  preview: { port: 4001, strictPort: true },
  // `@/` is the portal `src` folder, as shadcn components expect.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  optimizeDeps: { include: UI_SDK_ENTRIES },
  environments: { ssr: { optimizeDeps: { include: UI_SDK_ENTRIES } } },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      // Portal and site run side by side; a shared debugger port would clash.
      inspectorPort: false,
      ...(command === "serve" ? { config: { vars: localVars() } } : {}),
    }),
    // Route generation renames its temp file atomically. Keep it on the same
    // mounted filesystem as routeTree.gen.ts in Docker development.
    tanstackStart({ router: { tmpDir: "./src/.tanstack/tmp" } }),
    viteReact(),
    tailwindcss(),
  ],
}));

/// <reference types="vite/client" />

// Worker variables and secrets. See `.dev.vars.example` and README.md.
declare module "cloudflare:workers" {
  export const env: import("./server/member-access").SiteEnv;
}

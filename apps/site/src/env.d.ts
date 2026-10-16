/// <reference types="vite/client" />

// Worker variables and secrets. See `.dev.vars.example` and README.md.
declare module "cloudflare:workers" {
  export const env: {
    API_BASE_URL?: string;
    SITE_BASE_DOMAINS?: string;
    WORKER_SECRET?: string;
  };
}

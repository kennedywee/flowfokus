/// <reference types="vite/client" />

// Worker variables and secrets. See `.dev.vars.example` and README.md.
declare module "cloudflare:workers" {
  export const env: {
    API_BASE_URL?: string;
    HYDRAFLOW_DEMO_MODE?: string;
    HYDRAFLOW_DEMO_TOKEN?: string;
    WORKER_SECRET?: string;
    WORKOS_CLIENT_ID?: string;
    WORKOS_API_KEY?: string;
    WORKOS_REDIRECT_URI?: string;
    WORKOS_COOKIE_PASSWORD?: string;
  };
}

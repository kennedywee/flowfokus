import type { UnavailableReason } from "../server/access";
import { Notice } from "./ui";

const COPY: Record<UnavailableReason, { title: string; body: string }> = {
  sign_in_not_configured: {
    title: "Staff sign-in is not configured",
    body: "This portal has no WorkOS settings yet. Staff pages and actions stay turned off until sign-in is set up.",
  },
  sign_in_not_integrated: {
    title: "Staff sign-in is not available yet",
    body: "WorkOS settings are present, but the sign-in integration ships in the next release. Staff pages and actions stay turned off.",
  },
  demo_token_invalid: {
    title: "Local demo is not set up",
    body: "HYDRAFLOW_DEMO_MODE is on, but HYDRAFLOW_DEMO_TOKEN is missing or shorter than 16 characters. Check apps/portal/.dev.vars.",
  },
  demo_not_local: {
    title: "Local demo works on this computer only",
    body: "Open the portal at http://localhost:3001 to use the local demo.",
  },
};

export function AccessUnavailable({ reason }: { reason: UnavailableReason }) {
  const copy = COPY[reason];
  return (
    <Notice tone="warning" title={copy.title}>
      <p>{copy.body}</p>
    </Notice>
  );
}

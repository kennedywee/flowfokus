import type { UnavailableReason } from "../server/access";
import { Notice } from "./ui";

const COPY: Record<UnavailableReason, { title: string; body: string }> = {
  sign_in_not_configured: {
    title: "Staff sign-in is not configured",
    body: "This portal has no WorkOS settings yet, so staff pages and actions stay turned off. Add the WorkOS settings to the portal, then reload.",
  },
  sign_in_not_integrated: {
    title: "Staff sign-in is not available yet",
    body: "WorkOS settings are present, but the sign-in integration ships in the next release. Staff pages and actions stay turned off until then.",
  },
  demo_token_invalid: {
    title: "Local demo is not set up",
    body: "FLOWFOKUS_DEMO_MODE is on, but FLOWFOKUS_DEMO_TOKEN is missing or shorter than 16 characters. Set a token of 16 or more characters in apps/portal/.dev.vars, then reload.",
  },
  demo_not_local: {
    title: "Local demo works on this computer only",
    body: "The local demo is not a real sign-in, so it refuses any other address. Open the portal at http://localhost:3001 to use it.",
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

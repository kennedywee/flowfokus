import type { UnavailableReason } from "../server/access";
import { Blocked } from "./Blocked";

/**
 * Staff access is off because sign-in is not set up for this portal. Staff
 * cannot fix that, so every reason gets the same plain message from Paper.
 * The reason itself is for whoever runs the portal; it is not shown here.
 */
export function AccessUnavailable(_props: { reason: UnavailableReason }) {
  return (
    <Blocked
      title="Staff access is turned off"
      tone="warning"
      message="Staff sign-in is not set up yet, so staff pages stay closed. Ask the person who runs Flowfokus for your gym to finish the setup, then reload."
    />
  );
}

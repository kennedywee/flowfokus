import { createFileRoute } from "@tanstack/react-router";
import { Locations } from "../../../features/settings/Locations";

export const Route = createFileRoute("/$org/settings/locations")({
  component: Locations,
});

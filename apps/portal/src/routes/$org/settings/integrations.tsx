import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsSample } from "../../../features/preview/SettingsSamples";

export const Route = createFileRoute("/$org/settings/integrations")({
  component: IntegrationsSample,
});

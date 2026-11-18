import { createFileRoute } from "@tanstack/react-router";
import { NotificationsSample } from "../../../features/preview/SettingsSamples";

export const Route = createFileRoute("/$org/settings/notifications")({
  component: NotificationsSample,
});

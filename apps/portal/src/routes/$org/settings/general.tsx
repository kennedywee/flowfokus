import { createFileRoute } from "@tanstack/react-router";
import { General } from "../../../features/settings/General";

export const Route = createFileRoute("/$org/settings/general")({
  component: General,
});

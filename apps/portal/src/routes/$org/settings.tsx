import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "../../features/preview/Settings";

export const Route = createFileRoute("/$org/settings")({ component: Settings });

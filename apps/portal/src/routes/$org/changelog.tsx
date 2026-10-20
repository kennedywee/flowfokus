import { createFileRoute } from "@tanstack/react-router";
import { Changelog } from "../../features/preview/Changelog";

export const Route = createFileRoute("/$org/changelog")({ component: Changelog });

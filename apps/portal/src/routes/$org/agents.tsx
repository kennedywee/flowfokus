import { createFileRoute } from "@tanstack/react-router";
import { Agents } from "../../features/preview/Agents";

export const Route = createFileRoute("/$org/agents")({ component: Agents });

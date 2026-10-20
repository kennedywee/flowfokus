import { createFileRoute } from "@tanstack/react-router";
import { Reports } from "../../features/preview/Reports";

export const Route = createFileRoute("/$org/reports")({ component: Reports });

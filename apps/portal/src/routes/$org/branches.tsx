import { createFileRoute } from "@tanstack/react-router";
import { Branches } from "../../features/preview/Branches";

export const Route = createFileRoute("/$org/branches")({ component: Branches });

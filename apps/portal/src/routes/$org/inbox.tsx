import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "../../features/preview/Inbox";

export const Route = createFileRoute("/$org/inbox")({ component: Inbox });

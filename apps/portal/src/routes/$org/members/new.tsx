import { createFileRoute } from "@tanstack/react-router";
import { NewMember } from "../../../features/members/NewMember";

export const Route = createFileRoute("/$org/members/new")({
  // The top bar breadcrumb ends with this page's name.
  staticData: { crumb: () => "New member" },
  component: NewMember,
});

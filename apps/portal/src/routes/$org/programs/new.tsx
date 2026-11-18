import { createFileRoute } from "@tanstack/react-router";
import { ProgramForm } from "../../../features/programs/ProgramForm";

export const Route = createFileRoute("/$org/programs/new")({
  // The top bar breadcrumb ends with this page's name.
  staticData: { crumb: () => "New program" },
  component: NewProgramPage,
});

function NewProgramPage() {
  return <ProgramForm />;
}

import { createFileRoute, notFound } from "@tanstack/react-router";
import { GalleryEntryPage } from "../../features/components/Gallery";

export const Route = createFileRoute("/components/$name")({
  loader: async ({ params }) => {
    // Imported here so the registry stays out of the main bundle.
    const { findEntry } = await import("../../features/components/registry");
    const entry = findEntry(params.name);
    if (!entry) throw notFound();
    return entry;
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? "Component"} · Flowfokus components` }] }),
  component: EntryRoute,
});

function EntryRoute() {
  const entry = Route.useLoaderData();
  return <GalleryEntryPage entry={entry} />;
}

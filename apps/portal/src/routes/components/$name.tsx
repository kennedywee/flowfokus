import { createFileRoute, notFound } from "@tanstack/react-router";
import { GalleryEntryPage } from "../../features/components/Gallery";
import { findEntry } from "../../features/components/registry";

export const Route = createFileRoute("/components/$name")({
  loader: ({ params }) => {
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

import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { GalleryLayout } from "../../features/components/Gallery";

/**
 * The component gallery, for people and agents building portal screens.
 * Local development only: a production build answers Not Found. It needs no
 * sign-in and no organization, and every example uses sample data.
 */
export const Route = createFileRoute("/components")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({ meta: [{ title: "Components · Flowfokus" }] }),
  component: () => (
    <GalleryLayout>
      <Outlet />
    </GalleryLayout>
  ),
});

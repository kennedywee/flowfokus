import { createFileRoute } from "@tanstack/react-router";
import { GalleryIndex } from "../../features/components/Gallery";

export const Route = createFileRoute("/components/")({
  component: GalleryIndex,
});

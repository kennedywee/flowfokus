import { useRouter } from "@tanstack/react-router";
import { useToast } from "../../components/Toast";
import { failureMessage } from "../../lib/format";
import { useOrganization } from "../../lib/organization";
import { updateProgram } from "../../lib/staff.functions";
import { siteScheduleUrl } from "./facts";

/**
 * Publish or hide a program. The toast states the result Rails returned;
 * "Program published" offers View on site when the gym site is public.
 * It works from a toast after the page that started it has gone.
 */
export function usePublishProgram() {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();

  return async function setPublished(programId: string, published: boolean): Promise<boolean> {
    let result: Awaited<ReturnType<typeof updateProgram>>;
    try {
      result = await updateProgram({ data: { slug: organization.slug, id: programId, published } });
    } catch {
      result = { ok: false, error: { status: 0, code: "api_unreachable", message: "" } };
    }
    if (!result.ok) {
      toast.show({
        tone: "error",
        title: published ? "The program was not published" : "The program was not hidden",
        body: failureMessage(result.error),
        action: { label: "Try again", onClick: () => void setPublished(programId, published) },
      });
      return false;
    }
    void router.invalidate();
    if (result.data.published) {
      const url = siteScheduleUrl(organization.slug, window.location.hostname);
      toast.show({
        tone: "success",
        title: "Program published",
        body: organization.published ? "Members can book it online." : "It shows once the gym site is public.",
        ...(organization.published ? { action: { label: "View on site", onClick: () => void window.open(url, "_blank", "noopener") } } : {}),
      });
    } else {
      toast.show({ tone: "success", title: "Program is staff only", body: "Members can't see it online." });
    }
    return true;
  };
}

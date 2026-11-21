import { createFileRoute } from "@tanstack/react-router";
import { FailureNotice } from "../../../components/ui";
import { MemberDetails, MemberDetailsLoading } from "../../../features/members/MemberDetails";
import { getMemberRecord } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

type Loaded = Awaited<ReturnType<typeof getMemberRecord>>;

export const Route = createFileRoute("/$org/members/$memberId")({
  loader: async ({ params }): Promise<Loaded> => {
    if (!isUuid(params.memberId)) {
      return { ok: false as const, error: { status: 404, code: "not_found" as const, message: "Member not found" } };
    }
    return getMemberRecord({ data: { slug: params.org, id: params.memberId } });
  },
  // The top bar breadcrumb ends with the member's name.
  staticData: {
    crumb: (data) => {
      const loaded = data as Loaded | undefined;
      return loaded?.ok ? loaded.data.member.name : undefined;
    },
  },
  pendingComponent: MemberDetailsLoading,
  component: MemberPage,
});

function MemberPage() {
  const record = Route.useLoaderData();
  if (!record.ok) {
    return (
      <div className="page">
        <FailureNotice error={record.error} title="This member did not load" />
      </div>
    );
  }
  return <MemberDetails record={record.data} />;
}

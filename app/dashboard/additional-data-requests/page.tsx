import AdditionalDataRequestsList from "@/components/AdditionalDataRequestsList";
import { AdditionalDataRequestItem, AdditionalDataRequestPayload } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toPayload = (value: unknown): AdditionalDataRequestPayload => {
  const payload = toRecord(value);
  const relationshipAdditions = Array.isArray(payload.relationship_additions)
    ? payload.relationship_additions
    : [];

  return {
    person_changes: toRecord(payload.person_changes),
    private_changes: toRecord(payload.private_changes),
    relationship_additions: relationshipAdditions as AdditionalDataRequestPayload["relationship_additions"],
    submitter_note:
      typeof payload.submitter_note === "string" ? payload.submitter_note : null,
  };
};

export default async function AdditionalDataRequestsPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("additional_data_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("additional-data-requests.fetch.error", error);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const personIds = Array.from(
    new Set(
      rows
        .map((row) => row.person_id)
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  const profileIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.submitted_by, row.reviewed_by])
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  const [{ data: people }, { data: users }] = await Promise.all([
    personIds.length > 0
      ? supabase
          .from("persons")
          .select("id, full_name, generation, branch")
          .in("id", personIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            full_name: string;
            generation: number | null;
            branch: string | null;
          }[],
        }),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const personMetaById = new Map(
    (people ?? []).map((item) => [
      item.id,
      {
        full_name: item.full_name,
        generation: item.generation ?? null,
        branch: item.branch ?? null,
      },
    ]),
  );
  const userNameById = new Map(
    (users ?? []).map((item) => [item.id, item.full_name || item.id]),
  );

  const typedRequests: AdditionalDataRequestItem[] = rows
    .filter((row) => typeof row.id === "string")
    .map((row) => {
      const personId = typeof row.person_id === "string" ? row.person_id : "";
      const submittedBy =
        typeof row.submitted_by === "string" ? row.submitted_by : "";
      const reviewedBy =
        typeof row.reviewed_by === "string" ? row.reviewed_by : null;

      return {
        id: row.id as string,
        person_id: personId,
        submitted_by: submittedBy,
        status: (row.status as AdditionalDataRequestItem["status"]) || "pending",
        request_payload: toPayload(row.request_payload),
        before_snapshot: toRecord(row.before_snapshot),
        decision_note:
          typeof row.decision_note === "string" ? row.decision_note : null,
        reviewed_by: reviewedBy,
        reviewed_at:
          typeof row.reviewed_at === "string" ? row.reviewed_at : null,
        created_at:
          typeof row.created_at === "string"
            ? row.created_at
            : new Date().toISOString(),
        updated_at:
          typeof row.updated_at === "string"
            ? row.updated_at
            : new Date().toISOString(),
        person_name: personMetaById.get(personId)?.full_name ?? personId,
        person_generation: personMetaById.get(personId)?.generation ?? null,
        person_branch: personMetaById.get(personId)?.branch ?? null,
        submitter_name: userNameById.get(submittedBy) ?? submittedBy,
        reviewer_name: reviewedBy ? (userNameById.get(reviewedBy) ?? reviewedBy) : null,
      };
    });

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8">
          <h1 className="title">Yêu cầu bổ sung dữ liệu</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base">
            Xem và xử lý các đề xuất cập nhật thành viên và quan hệ gia phả.
          </p>
        </div>

        <AdditionalDataRequestsList initialRequests={typedRequests} />
      </div>
    </main>
  );
}


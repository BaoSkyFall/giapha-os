"use server";

import { getProfile, getSupabase } from "@/utils/supabase/queries";
import {
  getAdditionalDataRequestAdminLink,
  sendAdditionalDataRequestTelegram,
} from "@/utils/telegram";
import { revalidatePath } from "next/cache";

type RelationshipDirection = "parent" | "child" | "spouse";
type ChildRelationshipType = "biological_child" | "adopted_child";
type RelationshipType = "marriage" | ChildRelationshipType;
type RequestStatus = "pending" | "approved" | "rejected";

interface SubmitRelationshipAdditionInput {
  targetPersonId?: string;
  targetNewPerson?: {
    fullName?: string | null;
    gender?: "male" | "female" | "other";
    birthYear?: number | string | null;
    birthDateText?: string | null;
    note?: string | null;
  };
  direction: RelationshipDirection;
  relationshipType?: RelationshipType;
  note?: string | null;
}

export interface SubmitAdditionalDataRequestInput {
  personId: string;
  personChanges?: Record<string, unknown>;
  privateChanges?: Record<string, unknown>;
  relationshipAdditions?: SubmitRelationshipAdditionInput[];
  submitterNote?: string | null;
}

type JsonRecord = Record<string, unknown>;

interface NewRelationshipTargetProposal {
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_date_text: string | null;
  note: string | null;
  is_in_law: boolean;
}

interface NormalizedRelationshipAddition {
  target_person_id: string | null;
  target_person_name: string;
  target_is_new: boolean;
  target_new_person: NewRelationshipTargetProposal | null;
  direction: RelationshipDirection;
  relationship_type: RelationshipType;
  person_a: string | null;
  person_b: string | null;
  note: string | null;
}

interface RequestPayload {
  person_changes: JsonRecord;
  private_changes: JsonRecord;
  relationship_additions: NormalizedRelationshipAddition[];
  submitter_note: string | null;
}

const PERSON_FIELDS = [
  "full_name",
  "gender",
  "birth_year",
  "birth_month",
  "birth_day",
  "death_year",
  "death_month",
  "death_day",
  "is_deceased",
  "is_in_law",
  "birth_order",
  "generation",
  "branch",
  "other_names",
  "birth_date_text",
  "death_date_text",
  "avatar_url",
  "note",
] as const;

const PRIVATE_FIELDS = [
  "phone_number",
  "occupation",
  "current_residence",
] as const;

const NUMERIC_FIELDS = new Set<string>([
  "birth_year",
  "birth_month",
  "birth_day",
  "death_year",
  "death_month",
  "death_day",
  "birth_order",
  "generation",
]);

const BOOLEAN_FIELDS = new Set<string>(["is_deceased", "is_in_law"]);
const GENDER_VALUES = new Set(["male", "female", "other"]);
const CHILD_RELATION_TYPES = new Set(["biological_child", "adopted_child"]);

const FIELD_LABELS: Record<string, string> = {
  full_name: "họ và tên",
  gender: "giới tính",
  birth_year: "năm sinh",
  birth_month: "tháng sinh",
  birth_day: "ngày sinh",
  death_year: "năm mất",
  death_month: "tháng mất",
  death_day: "ngày mất",
  is_deceased: "đã mất",
  is_in_law: "là dâu/rể",
  birth_order: "thứ tự sinh",
  generation: "đời",
  branch: "Nhánh",
  other_names: "tên khác",
  birth_date_text: "ngày sinh (văn bản)",
  death_date_text: "ngày mất (văn bản)",
  avatar_url: "ảnh đại diện",
  note: "ghi chú",
  phone_number: "số điện thoại",
  occupation: "nghề nghiệp",
  current_residence: "nơi ở hiện tại",
  relationship_additions: "quan hệ gia phả",
};

const asObject = (value: unknown): JsonRecord => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
};

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const normalizePersonValue = (field: string, value: unknown) => {
  if (BOOLEAN_FIELDS.has(field)) {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (field === "gender") {
    if (typeof value !== "string" || !GENDER_VALUES.has(value)) return undefined;
    return value;
  }

  const normalized = normalizeText(value);
  if (field === "full_name" && !normalized) return undefined;
  return normalized;
};

const normalizePrivateValue = (value: unknown) => {
  const normalized = normalizeText(value);
  return normalized ?? undefined;
};

const buildChangedFields = (
  allowedFields: readonly string[],
  proposed: JsonRecord,
  current: JsonRecord,
  normalizer: (field: string, value: unknown) => unknown,
) => {
  const changes: JsonRecord = {};
  const before: JsonRecord = {};

  for (const field of allowedFields) {
    if (!(field in proposed)) continue;
    const nextValue = normalizer(field, proposed[field]);
    if (nextValue === undefined) continue;
    const currentValue = normalizer(field, current[field]);

    if (nextValue !== currentValue) {
      changes[field] = nextValue;
      before[field] = current[field] ?? null;
    }
  }

  return { changes, before };
};

const buildChangedFieldList = (payload: RequestPayload) => {
  const fields = [
    ...Object.keys(payload.person_changes),
    ...Object.keys(payload.private_changes),
  ];

  if (payload.relationship_additions.length > 0) {
    fields.push("relationship_additions");
  }

  return fields.map((field) => FIELD_LABELS[field] ?? field);
};

const buildRelationshipDetails = (relationships: NormalizedRelationshipAddition[]) => {
  return relationships.map((item) => {
    const relationshipType =
      item.relationship_type === "marriage"
        ? "marriage"
        : item.relationship_type === "adopted_child"
          ? "adopted_child"
          : "biological_child";

    const targetLabel = item.target_is_new
      ? `${item.target_person_name} (mới)`
      : item.target_person_name;

    return `${item.direction}:${relationshipType}:${targetLabel}`;
  });
};

const normalizeRelationshipAdditions = async (
  personId: string,
  additions: SubmitRelationshipAdditionInput[],
) => {
  const supabase = await getSupabase();

  const cleaned = additions
    .map((item) => ({
      targetPersonId: normalizeText(item.targetPersonId),
      targetNewPerson: (() => {
        const raw = asObject(item.targetNewPerson);
        const fullName = normalizeText(raw.fullName);
        if (!fullName) return null;

        const gender =
          typeof raw.gender === "string" && GENDER_VALUES.has(raw.gender)
            ? (raw.gender as "male" | "female" | "other")
            : "other";

        const birthYearRaw = raw.birthYear;
        const parsedBirthYear =
          birthYearRaw === null || birthYearRaw === undefined || birthYearRaw === ""
            ? null
            : Number(birthYearRaw);
        const birthYear = Number.isFinite(parsedBirthYear)
          ? parsedBirthYear
          : null;

        return {
          full_name: fullName,
          gender,
          birth_year: birthYear,
          birth_date_text: normalizeText(raw.birthDateText),
          note: normalizeText(raw.note),
          is_in_law: item.direction === "spouse",
        } satisfies NewRelationshipTargetProposal;
      })(),
      direction: item.direction,
      relationshipType: item.relationshipType,
      note: normalizeText(item.note) ?? null,
    }))
    .filter(
      (item) =>
        (item.direction === "parent" ||
          item.direction === "child" ||
          item.direction === "spouse") &&
        ((typeof item.targetPersonId === "string" &&
          item.targetPersonId.length > 0 &&
          item.targetPersonId !== personId) ||
          !!item.targetNewPerson),
    );

  if (cleaned.length === 0) return [];

  const uniqueTargetIds = Array.from(
    new Set(
      cleaned
        .map((item) => item.targetPersonId)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  );

  const { data: people } = await supabase
    .from("persons")
    .select("id, full_name")
    .in("id", uniqueTargetIds);

  const personMap = new Map((people ?? []).map((item) => [item.id, item]));
  const normalized: NormalizedRelationshipAddition[] = [];

  for (const item of cleaned) {
    const targetPerson = item.targetPersonId
      ? personMap.get(item.targetPersonId)
      : undefined;

    if (!targetPerson && !item.targetNewPerson) continue;

    const relationshipType: RelationshipType =
      item.direction === "spouse"
        ? "marriage"
        : CHILD_RELATION_TYPES.has(item.relationshipType ?? "")
          ? (item.relationshipType as ChildRelationshipType)
          : "biological_child";

    const resolvedTargetId = targetPerson?.id ?? null;
    const isNewTarget = !targetPerson && !!item.targetNewPerson;
    const resolvedTargetName =
      targetPerson?.full_name ?? item.targetNewPerson?.full_name ?? "Thành viên mới";

    let personA: string | null = personId;
    let personB: string | null = resolvedTargetId;

    if (item.direction === "parent") {
      personA = resolvedTargetId;
      personB = personId;
    } else if (item.direction === "child") {
      personA = personId;
      personB = resolvedTargetId;
    } else {
      if (resolvedTargetId) {
        const ordered = [personId, resolvedTargetId].sort();
        personA = ordered[0];
        personB = ordered[1];
      } else {
        personA = personId;
        personB = null;
      }
    }

    normalized.push({
      target_person_id: resolvedTargetId,
      target_person_name: resolvedTargetName,
      target_is_new: isNewTarget,
      target_new_person: item.targetNewPerson ?? null,
      direction: item.direction,
      relationship_type: relationshipType,
      person_a: personA,
      person_b: personB,
      note: item.note,
    });
  }

  return normalized;
};

const loadRequestById = async (requestId: string) => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("additional_data_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !data) {
    return { error: "Không tìm thấy yêu cầu." as const };
  }

  const payloadRaw = asObject(data.request_payload);
  const payload: RequestPayload = {
    person_changes: asObject(payloadRaw.person_changes),
    private_changes: asObject(payloadRaw.private_changes),
    relationship_additions: Array.isArray(payloadRaw.relationship_additions)
      ? (payloadRaw.relationship_additions as NormalizedRelationshipAddition[])
      : [],
    submitter_note: normalizeText(payloadRaw.submitter_note) ?? null,
  };

  return {
    data,
    payload,
  };
};

const notifyTelegram = async (
  event: "submitted" | "approved" | "rejected",
  requestId: string,
  personName: string,
  submitterName: string,
  payload: RequestPayload,
  decisionNote?: string | null,
) => {
  const result = await sendAdditionalDataRequestTelegram({
    event,
    requestId,
    personName,
    submitterName,
    changedFields: buildChangedFieldList(payload),
    relationshipDetails: buildRelationshipDetails(payload.relationship_additions),
    adminLink: getAdditionalDataRequestAdminLink(requestId),
    decisionNote,
  });

  if (!result.ok && !result.skipped) {
    console.error("[additional_data_request.telegram]", result.error);
  }

  return result;
};

export async function submitAdditionalDataRequest(
  input: SubmitAdditionalDataRequestInput,
) {
  const profile = await getProfile();
  if (!profile) return { error: "Bạn chưa đăng nhập." };
  if (profile.role === "admin") {
    return { error: "Quản trị viên hãy cập nhật trực tiếp, không gửi yêu cầu." };
  }

  const personId = normalizeText(input.personId);
  if (!personId) return { error: "Thiếu personId." };

  const supabase = await getSupabase();
  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("*")
    .eq("id", personId)
    .single();

  if (personError || !person) {
    return { error: "Không tìm thấy thành viên được chọn." };
  }

  const { data: privateData } = await supabase
    .from("person_details_private")
    .select("*")
    .eq("person_id", personId)
    .single();

  const proposedPerson = asObject(input.personChanges);
  const proposedPrivate = asObject(input.privateChanges);

  const personDiff = buildChangedFields(
    PERSON_FIELDS,
    proposedPerson,
    asObject(person),
    normalizePersonValue,
  );

  const privateDiff = buildChangedFields(
    PRIVATE_FIELDS,
    proposedPrivate,
    asObject(privateData ?? {}),
    (_field, value) => normalizePrivateValue(value),
  );

  const normalizedRelationships = await normalizeRelationshipAdditions(
    personId,
    Array.isArray(input.relationshipAdditions) ? input.relationshipAdditions : [],
  );

  if (
    Object.keys(personDiff.changes).length === 0 &&
    Object.keys(privateDiff.changes).length === 0 &&
    normalizedRelationships.length === 0
  ) {
    return { error: "Không có thay đổi hợp lệ để gửi." };
  }

  const payload: RequestPayload = {
    person_changes: personDiff.changes,
    private_changes: privateDiff.changes,
    relationship_additions: normalizedRelationships,
    submitter_note: normalizeText(input.submitterNote),
  };

  const beforeSnapshot = {
    person_before: personDiff.before,
    private_before: privateDiff.before,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("additional_data_requests")
    .insert({
      person_id: personId,
      submitted_by: profile.id,
      status: "pending" as RequestStatus,
      request_payload: payload,
      before_snapshot: beforeSnapshot,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("submitAdditionalDataRequest.insertError", insertError);
    return { error: "Không thể tạo yêu cầu." };
  }

  const telegram = await notifyTelegram(
    "submitted",
    inserted.id,
    person.full_name,
    profile.full_name || profile.id,
    payload,
  );

  revalidatePath("/dashboard/additional-data-requests");
  revalidatePath("/dashboard/members");

  if (!telegram.ok) {
    return {
      success: true,
      requestId: inserted.id,
      warning: telegram.error,
    };
  }

  return {
    success: true,
    requestId: inserted.id,
  };
}

const applyRelationshipAdditions = async (
  requestPayload: RequestPayload,
  requestPersonId: string,
) => {
  const supabase = await getSupabase();

  for (const rel of requestPayload.relationship_additions) {
    let targetPersonId = rel.target_person_id;

    if ((!targetPersonId || rel.target_is_new) && rel.target_new_person) {
      const { data: createdPerson, error: createPersonError } = await supabase
        .from("persons")
        .insert({
          full_name: rel.target_new_person.full_name,
          gender: rel.target_new_person.gender,
          birth_year: rel.target_new_person.birth_year,
          birth_date_text: rel.target_new_person.birth_date_text,
          note: rel.target_new_person.note,
          is_in_law: rel.target_new_person.is_in_law,
          is_deceased: false,
        })
        .select("id")
        .single();

      if (createPersonError || !createdPerson) {
        throw new Error(
          `Không thể tạo thành viên mới cho đề xuất quan hệ: ${createPersonError?.message ?? "Không rõ lỗi"}`,
        );
      }

      targetPersonId = createdPerson.id;
    }

    if (!targetPersonId) {
      throw new Error("Thiếu thành viên mục tiêu trong đề xuất quan hệ.");
    }

    const relationshipType: RelationshipType =
      rel.direction === "spouse" ? "marriage" : rel.relationship_type;

    let personA = requestPersonId;
    let personB = targetPersonId;

    if (rel.direction === "parent") {
      personA = targetPersonId;
      personB = requestPersonId;
    } else if (rel.direction === "spouse") {
      const ordered = [requestPersonId, targetPersonId].sort();
      personA = ordered[0];
      personB = ordered[1];
    }

    let exists = false;

    if (relationshipType === "marriage") {
      const { data: marriageMatches } = await supabase
        .from("relationships")
        .select("id")
        .eq("type", "marriage")
        .or(
          `and(person_a.eq.${personA},person_b.eq.${personB}),and(person_a.eq.${personB},person_b.eq.${personA})`,
        )
        .limit(1);

      exists = !!marriageMatches && marriageMatches.length > 0;
    } else {
      const { data: exactMatch } = await supabase
        .from("relationships")
        .select("id")
        .eq("type", relationshipType)
        .eq("person_a", personA)
        .eq("person_b", personB)
        .limit(1);

      exists = !!exactMatch && exactMatch.length > 0;
    }

    if (exists) continue;

    const { error } = await supabase.from("relationships").insert({
      type: relationshipType,
      person_a: personA,
      person_b: personB,
      note: rel.note ?? rel.target_new_person?.note ?? null,
    });

    if (error) {
      throw new Error(`Không thể áp dụng đề xuất quan hệ: ${error.message}`);
    }
  }
};

export async function approveAdditionalDataRequest(
  requestId: string,
  decisionNote?: string | null,
) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Chỉ quản trị viên mới được phê duyệt yêu cầu." };
  }

  const loaded = await loadRequestById(requestId);
  if ("error" in loaded) return { error: loaded.error };

  if (loaded.data.status !== "pending") {
    return { error: "Chỉ yêu cầu đang chờ duyệt mới có thể phê duyệt." };
  }

  const requestPayload = loaded.payload;
  const supabase = await getSupabase();

  if (Object.keys(requestPayload.person_changes).length > 0) {
    const { error } = await supabase
      .from("persons")
      .update(requestPayload.person_changes)
      .eq("id", loaded.data.person_id);

    if (error) {
      return { error: `Không thể áp dụng thay đổi thông tin thành viên: ${error.message}` };
    }
  }

  if (Object.keys(requestPayload.private_changes).length > 0) {
    const { error } = await supabase.from("person_details_private").upsert(
      {
        person_id: loaded.data.person_id,
        ...requestPayload.private_changes,
      },
      { onConflict: "person_id" },
    );

    if (error) {
      return { error: `Không thể áp dụng thay đổi trường riêng tư: ${error.message}` };
    }
  }

  try {
    await applyRelationshipAdditions(requestPayload, loaded.data.person_id);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không thể áp dụng đề xuất quan hệ.",
    };
  }

  const reviewedAt = new Date().toISOString();
  const resolvedDecisionNote = normalizeText(decisionNote);

  const { error: statusError } = await supabase
    .from("additional_data_requests")
    .update({
      status: "approved" as RequestStatus,
      decision_note: resolvedDecisionNote,
      reviewed_by: profile.id,
      reviewed_at: reviewedAt,
    })
    .eq("id", requestId);

  if (statusError) {
    return { error: `Không thể cập nhật trạng thái yêu cầu: ${statusError.message}` };
  }

  const { data: person } = await supabase
    .from("persons")
    .select("full_name")
    .eq("id", loaded.data.person_id)
    .single();

  const { data: submitter } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", loaded.data.submitted_by)
    .single();

  await notifyTelegram(
    "approved",
    requestId,
    person?.full_name ?? loaded.data.person_id,
    submitter?.full_name || submitter?.id || loaded.data.submitted_by,
    requestPayload,
    resolvedDecisionNote,
  );

  revalidatePath("/dashboard/additional-data-requests");
  revalidatePath("/dashboard/members");

  return { success: true, status: "approved", reviewedAt };
}

export async function rejectAdditionalDataRequest(
  requestId: string,
  decisionNote?: string | null,
) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Chỉ quản trị viên mới được từ chối yêu cầu." };
  }

  const loaded = await loadRequestById(requestId);
  if ("error" in loaded) return { error: loaded.error };

  if (loaded.data.status !== "pending") {
    return { error: "Chỉ yêu cầu đang chờ duyệt mới có thể từ chối." };
  }

  const supabase = await getSupabase();
  const reviewedAt = new Date().toISOString();
  const resolvedDecisionNote = normalizeText(decisionNote);

  const { error } = await supabase
    .from("additional_data_requests")
    .update({
      status: "rejected" as RequestStatus,
      decision_note: resolvedDecisionNote,
      reviewed_by: profile.id,
      reviewed_at: reviewedAt,
    })
    .eq("id", requestId);

  if (error) {
    return { error: `Không thể cập nhật trạng thái yêu cầu: ${error.message}` };
  }

  const { data: person } = await supabase
    .from("persons")
    .select("full_name")
    .eq("id", loaded.data.person_id)
    .single();

  const { data: submitter } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", loaded.data.submitted_by)
    .single();

  await notifyTelegram(
    "rejected",
    requestId,
    person?.full_name ?? loaded.data.person_id,
    submitter?.full_name || submitter?.id || loaded.data.submitted_by,
    loaded.payload,
    resolvedDecisionNote,
  );

  revalidatePath("/dashboard/additional-data-requests");

  return { success: true, status: "rejected", reviewedAt };
}

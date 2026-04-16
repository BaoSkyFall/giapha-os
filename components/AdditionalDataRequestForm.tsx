"use client";

import { submitAdditionalDataRequest } from "@/app/actions/additional-data-request";
import { Gender, Person } from "@/types";
import {
  FALLBACK_BRANCH_OPTIONS,
  FALLBACK_GENERATION_OPTIONS,
} from "@/utils/auth/profile";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useState } from "react";

type RelationshipDirection = "parent" | "child" | "spouse";
type ChildRelationshipType = "biological_child" | "adopted_child";
type RelationshipTargetMode = "existing" | "new";

interface RelationshipDraft {
  id: string;
  targetMode: RelationshipTargetMode;
  targetPersonId: string;
  targetNewPersonFullName: string;
  targetNewPersonGender: Gender;
  targetNewPersonBirthYear: string;
  targetNewPersonBirthDateText: string;
  targetNewPersonNote: string;
  direction: RelationshipDirection;
  relationshipType: ChildRelationshipType;
  note: string;
}

interface PersonBrief {
  id: string;
  full_name: string;
}

interface AdditionalDataRequestFormProps {
  person: Person;
  onSuccess?: () => void;
  onCancel: () => void;
}

interface PersonFormState {
  full_name: string;
  other_names: string;
  gender: Gender;
  birth_year: string;
  birth_month: string;
  birth_day: string;
  death_year: string;
  death_month: string;
  death_day: string;
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: string;
  generation: string;
  branch: string;
  birth_date_text: string;
  death_date_text: string;
  avatar_url: string;
  note: string;
}

const toNumericString = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const createRelationshipDraft = (
  overrides?: Partial<Pick<RelationshipDraft, "direction" | "targetMode">>,
): RelationshipDraft => ({
  id: Math.random().toString(36).slice(2),
  targetMode: overrides?.targetMode ?? "existing",
  targetPersonId: "",
  targetNewPersonFullName: "",
  targetNewPersonGender: "other",
  targetNewPersonBirthYear: "",
  targetNewPersonBirthDateText: "",
  targetNewPersonNote: "",
  direction: overrides?.direction ?? "child",
  relationshipType: "biological_child",
  note: "",
});

export default function AdditionalDataRequestForm({
  person,
  onSuccess,
  onCancel,
}: AdditionalDataRequestFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [targets, setTargets] = useState<PersonBrief[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [personState, setPersonState] = useState<PersonFormState>({
    full_name: person.full_name ?? "",
    other_names: person.other_names ?? "",
    gender: person.gender ?? "male",
    birth_year: toNumericString(person.birth_year),
    birth_month: toNumericString(person.birth_month),
    birth_day: toNumericString(person.birth_day),
    death_year: toNumericString(person.death_year),
    death_month: toNumericString(person.death_month),
    death_day: toNumericString(person.death_day),
    is_deceased: !!person.is_deceased,
    is_in_law: !!person.is_in_law,
    birth_order: toNumericString(person.birth_order),
    generation: toNumericString(person.generation),
    branch: person.branch ?? "",
    birth_date_text: person.birth_date_text ?? "",
    death_date_text: person.death_date_text ?? "",
    avatar_url: person.avatar_url ?? "",
    note: person.note ?? "",
  });

  const [privateState, setPrivateState] = useState({
    phone_number: "",
    occupation: "",
    current_residence: "",
  });

  const [submitterNote, setSubmitterNote] = useState("");
  const [relationshipDrafts, setRelationshipDrafts] = useState<
    RelationshipDraft[]
  >([]);

  useEffect(() => {
    let active = true;

    const fetchTargets = async () => {
      setLoadingTargets(true);
      const { data, error: peopleError } = await supabase
        .from("persons")
        .select("id, full_name")
        .neq("id", person.id)
        .order("full_name", { ascending: true })
        .limit(500);

      if (!active) return;

      if (peopleError) {
        console.error("fetchTargets.error", peopleError);
        setTargets([]);
      } else {
        setTargets((data as PersonBrief[]) ?? []);
      }

      setLoadingTargets(false);
    };

    fetchTargets();

    return () => {
      active = false;
    };
  }, [person.id, supabase]);

  const handlePersonField = (
    field: keyof PersonFormState,
    value: string | boolean,
  ) => {
    setPersonState((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrivateField = (
    field: keyof typeof privateState,
    value: string,
  ) => {
    setPrivateState((prev) => ({ ...prev, [field]: value }));
  };

  const addRelationshipDraft = (
    overrides?: Partial<Pick<RelationshipDraft, "direction" | "targetMode">>,
  ) => {
    setRelationshipDrafts((prev) => [...prev, createRelationshipDraft(overrides)]);
  };

  const removeRelationshipDraft = (id: string) => {
    setRelationshipDrafts((prev) => prev.filter((row) => row.id !== id));
  };

  const updateRelationshipDraft = (
    id: string,
    patch: Partial<RelationshipDraft>,
  ) => {
    setRelationshipDrafts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const relationshipAdditions: Array<{
      targetPersonId?: string;
      targetNewPerson?: {
        fullName: string;
        gender: Gender;
        birthYear: number | null;
        birthDateText: string | null;
        note: string | null;
      };
      direction: RelationshipDirection;
      relationshipType: "marriage" | ChildRelationshipType;
      note: string;
    }> = relationshipDrafts
      .filter((row) =>
        row.targetMode === "existing"
          ? row.targetPersonId.length > 0
          : row.targetNewPersonFullName.trim().length > 0,
      )
      .map((row) => ({
        targetPersonId:
          row.targetMode === "existing" ? row.targetPersonId : undefined,
        targetNewPerson:
          row.targetMode === "new"
            ? {
                fullName: row.targetNewPersonFullName.trim(),
                gender: row.targetNewPersonGender,
                birthYear:
                  row.targetNewPersonBirthYear.trim().length > 0
                    ? Number(row.targetNewPersonBirthYear)
                    : null,
                birthDateText:
                  row.targetNewPersonBirthDateText.trim().length > 0
                    ? row.targetNewPersonBirthDateText.trim()
                    : null,
                note:
                  row.targetNewPersonNote.trim().length > 0
                    ? row.targetNewPersonNote.trim()
                    : null,
              }
            : undefined,
        direction: row.direction,
        relationshipType:
          row.direction === "spouse"
            ? "marriage"
            : (row.relationshipType as ChildRelationshipType),
        note: row.note,
      }));

    const result = await submitAdditionalDataRequest({
      personId: person.id,
      personChanges: { ...personState },
      privateChanges: { ...privateState },
      relationshipAdditions,
      submitterNote,
    });

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    const successText = result?.warning
      ? `Gửi yêu cầu thành công, nhưng gửi thông báo Telegram gặp lỗi: ${result.warning}`
      : "Gửi yêu cầu thành công. Quản trị viên sẽ xem xét và phê duyệt/từ chối.";
    setSuccess(successText);
    setSubmitting(false);

    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
        Gửi đề xuất bổ sung dữ liệu cho thành viên này. Yêu cầu chỉ được áp
        dụng sau khi quản trị viên phê duyệt.
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-stone-900">Trường công khai</h3>
        <p className="mt-1 text-sm text-stone-500">
          Bạn có thể đề xuất cập nhật bất kỳ trường nào.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Họ và tên
            </span>
            <input
              value={personState.full_name}
              onChange={(e) => handlePersonField("full_name", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
              required
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Tên khác
            </span>
            <input
              value={personState.other_names}
              onChange={(e) => handlePersonField("other_names", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Giới tính
            </span>
            <select
              value={personState.gender}
              onChange={(e) =>
                handlePersonField("gender", e.target.value as Gender)
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">Nhánh</span>
            <select
              value={personState.branch}
              onChange={(e) => handlePersonField("branch", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            >
              <option value="">Chọn nhánh</option>
              {FALLBACK_BRANCH_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">Đời</span>
            <select
              value={personState.generation}
              onChange={(e) => handlePersonField("generation", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            >
              <option value="">Chọn đời</option>
              {FALLBACK_GENERATION_OPTIONS.map((value) => (
                <option key={value} value={String(value)}>
                  Đời {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Thứ tự sinh
            </span>
            <input
              value={personState.birth_order}
              onChange={(e) => handlePersonField("birth_order", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Năm sinh
            </span>
            <input
              value={personState.birth_year}
              onChange={(e) => handlePersonField("birth_year", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Tháng sinh
            </span>
            <input
              value={personState.birth_month}
              onChange={(e) => handlePersonField("birth_month", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Ngày sinh
            </span>
            <input
              value={personState.birth_day}
              onChange={(e) => handlePersonField("birth_day", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Ngày sinh (văn bản)
            </span>
            <input
              value={personState.birth_date_text}
              onChange={(e) =>
                handlePersonField("birth_date_text", e.target.value)
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">Đã mất</span>
            <select
              value={personState.is_deceased ? "true" : "false"}
              onChange={(e) =>
                handlePersonField("is_deceased", e.target.value === "true")
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            >
              <option value="false">Không</option>
              <option value="true">Có</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Là dâu/rể
            </span>
            <select
              value={personState.is_in_law ? "true" : "false"}
              onChange={(e) =>
                handlePersonField("is_in_law", e.target.value === "true")
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            >
              <option value="false">Không</option>
              <option value="true">Có</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">Năm mất</span>
            <input
              value={personState.death_year}
              onChange={(e) => handlePersonField("death_year", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">Tháng mất</span>
            <input
              value={personState.death_month}
              onChange={(e) => handlePersonField("death_month", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">Ngày mất</span>
            <input
              value={personState.death_day}
              onChange={(e) => handlePersonField("death_day", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Ngày mất (văn bản)
            </span>
            <input
              value={personState.death_date_text}
              onChange={(e) =>
                handlePersonField("death_date_text", e.target.value)
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-stone-700">
              Đường dẫn ảnh đại diện
            </span>
            <input
              value={personState.avatar_url}
              onChange={(e) => handlePersonField("avatar_url", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-stone-700">Ghi chú</span>
            <textarea
              value={personState.note}
              onChange={(e) => handlePersonField("note", e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-stone-900">
          Đề xuất trường riêng tư
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Bạn có thể đề xuất trường riêng tư. Bạn không được xem giá trị riêng
          tư hiện tại.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Số điện thoại
            </span>
            <input
              value={privateState.phone_number}
              onChange={(e) => handlePrivateField("phone_number", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Nghề nghiệp
            </span>
            <input
              value={privateState.occupation}
              onChange={(e) => handlePrivateField("occupation", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-stone-700">
              Nơi ở hiện tại
            </span>
            <input
              value={privateState.current_residence}
              onChange={(e) =>
                handlePrivateField("current_residence", e.target.value)
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">
              Đề xuất quan hệ gia phả
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Có thể thêm nhiều con và nhiều vợ/chồng bằng nhiều dòng đề xuất.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                addRelationshipDraft({
                  direction: "child",
                  targetMode: "new",
                })
              }
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              + Thêm con
            </button>
            <button
              type="button"
              onClick={() =>
                addRelationshipDraft({
                  direction: "spouse",
                  targetMode: "new",
                })
              }
              className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
            >
              + Thêm vợ/chồng
            </button>
            <button
              type="button"
              onClick={() => addRelationshipDraft()}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              + Thêm quan hệ khác
            </button>
          </div>
        </div>

        {loadingTargets ? (
          <p className="mt-4 text-sm text-stone-500">Đang tải danh sách thành viên...</p>
        ) : (
          <div className="mt-4 space-y-4">
            {relationshipDrafts.length === 0 && (
              <p className="text-sm text-stone-500">
                Chưa có đề xuất quan hệ nào.
              </p>
            )}

            {relationshipDrafts.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-stone-200 bg-stone-50/70 p-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-stone-700">
                      Hướng quan hệ
                    </span>
                    <select
                      value={row.direction}
                      onChange={(e) =>
                        updateRelationshipDraft(row.id, {
                          direction: e.target.value as RelationshipDirection,
                        })
                      }
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                    >
                      <option value="parent">là cha/mẹ của thành viên hiện tại</option>
                      <option value="child">là con của thành viên hiện tại</option>
                      <option value="spouse">là vợ/chồng của thành viên hiện tại</option>
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-stone-700">
                      Loại thành viên mục tiêu
                    </span>
                    <select
                      value={row.targetMode}
                      onChange={(e) =>
                        updateRelationshipDraft(row.id, {
                          targetMode: e.target.value as RelationshipTargetMode,
                          targetPersonId:
                            e.target.value === "existing" ? row.targetPersonId : "",
                          targetNewPersonFullName:
                            e.target.value === "new" ? row.targetNewPersonFullName : "",
                          targetNewPersonBirthYear:
                            e.target.value === "new" ? row.targetNewPersonBirthYear : "",
                          targetNewPersonBirthDateText:
                            e.target.value === "new"
                              ? row.targetNewPersonBirthDateText
                              : "",
                          targetNewPersonNote:
                            e.target.value === "new" ? row.targetNewPersonNote : "",
                        })
                      }
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                    >
                      <option value="existing">Chọn thành viên đã có</option>
                      <option value="new">Thêm thành viên mới (con/vợ/chồng)</option>
                    </select>
                  </label>

                  {row.targetMode === "existing" ? (
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-stone-700">
                        Thành viên mục tiêu
                      </span>
                      <select
                        value={row.targetPersonId}
                        onChange={(e) =>
                          updateRelationshipDraft(row.id, {
                            targetPersonId: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                      >
                        <option value="">Chọn thành viên</option>
                        {targets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-stone-700">
                        Họ và tên thành viên mới
                      </span>
                      <input
                        value={row.targetNewPersonFullName}
                        onChange={(e) =>
                          updateRelationshipDraft(row.id, {
                            targetNewPersonFullName: e.target.value,
                          })
                        }
                        placeholder="Nhập họ và tên"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                      />
                    </label>
                  )}

                  {row.targetMode === "new" && (
                    <>
                      <label className="text-sm">
                        <span className="mb-1 block font-medium text-stone-700">
                          Giới tính thành viên mới
                        </span>
                        <select
                          value={row.targetNewPersonGender}
                          onChange={(e) =>
                            updateRelationshipDraft(row.id, {
                              targetNewPersonGender: e.target.value as Gender,
                            })
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                        >
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      </label>

                      <label className="text-sm">
                        <span className="mb-1 block font-medium text-stone-700">
                          Năm sinh thành viên mới (tùy chọn)
                        </span>
                        <input
                          value={row.targetNewPersonBirthYear}
                          onChange={(e) =>
                            updateRelationshipDraft(row.id, {
                              targetNewPersonBirthYear: e.target.value,
                            })
                          }
                          placeholder="Ví dụ: 1998"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                        />
                      </label>

                      <label className="text-sm md:col-span-2">
                        <span className="mb-1 block font-medium text-stone-700">
                          Ngày sinh thành viên mới (văn bản, tùy chọn)
                        </span>
                        <input
                          value={row.targetNewPersonBirthDateText}
                          onChange={(e) =>
                            updateRelationshipDraft(row.id, {
                              targetNewPersonBirthDateText: e.target.value,
                            })
                          }
                          placeholder="Ví dụ: Khoảng năm 1950"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                        />
                      </label>

                      <label className="text-sm md:col-span-2">
                        <span className="mb-1 block font-medium text-stone-700">
                          Ghi chú thành viên mới
                        </span>
                        <input
                          value={row.targetNewPersonNote}
                          onChange={(e) =>
                            updateRelationshipDraft(row.id, {
                              targetNewPersonNote: e.target.value,
                            })
                          }
                          placeholder="Thông tin thêm về thành viên mới"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                        />
                      </label>
                    </>
                  )}

                  {row.direction !== "spouse" && (
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-stone-700">
                        Loại quan hệ
                      </span>
                      <select
                        value={row.relationshipType}
                        onChange={(e) =>
                          updateRelationshipDraft(row.id, {
                            relationshipType: e.target
                              .value as ChildRelationshipType,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                      >
                        <option value="biological_child">Con đẻ</option>
                        <option value="adopted_child">Con nuôi</option>
                      </select>
                    </label>
                  )}

                  <label className="text-sm md:col-span-2">
                    <span className="mb-1 block font-medium text-stone-700">
                      Ghi chú
                    </span>
                    <input
                      value={row.note}
                      onChange={(e) =>
                        updateRelationshipDraft(row.id, { note: e.target.value })
                      }
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => removeRelationshipDraft(row.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-stone-700">
            Ghi chú người gửi
          </span>
          <textarea
            value={submitterNote}
            onChange={(e) => setSubmitterNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
            placeholder="Mô tả thay đổi và lý do..."
          />
        </label>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          disabled={submitting}
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
        </button>
      </div>
    </form>
  );
}

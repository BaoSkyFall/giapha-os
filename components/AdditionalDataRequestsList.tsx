"use client";

import {
  approveAdditionalDataRequest,
  rejectAdditionalDataRequest,
} from "@/app/actions/additional-data-request";
import {
  AdditionalDataRequestItem,
  RelationshipAdditionProposal,
} from "@/types";
import {
  ArrowRight,
  GitBranch,
  Heart,
  ListChecks,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

interface AdditionalDataRequestsListProps {
  initialRequests: AdditionalDataRequestItem[];
}

const PAGE_SIZE = 10;

const statusClasses: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
};

const statusLabels: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã phê duyệt",
  rejected: "Đã từ chối",
};

const normalizeForSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatChangedFields = (item: AdditionalDataRequestItem) => {
  const payload = item.request_payload;
  const fields = [
    ...Object.keys(payload.person_changes || {}),
    ...Object.keys(payload.private_changes || {}),
  ];

  if ((payload.relationship_additions || []).length > 0) {
    fields.push("quan_he_gia_pha");
  }

  return fields.length > 0 ? fields.join(", ") : "Không có trường thay đổi";
};

const buildSearchText = (item: AdditionalDataRequestItem) => {
  const payloadText = JSON.stringify(item.request_payload || {});
  const beforeText = JSON.stringify(item.before_snapshot || {});

  return normalizeForSearch(
    [
      item.id,
      item.person_name,
      item.person_branch || "",
      item.person_generation != null ? String(item.person_generation) : "",
      item.submitter_name,
      item.reviewer_name || "",
      item.decision_note || "",
      item.request_payload.submitter_note || "",
      formatChangedFields(item),
      payloadText,
      beforeText,
    ].join(" "),
  );
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
};

const genderLabels: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const directionLabels: Record<string, string> = {
  parent: "Cha/mẹ",
  child: "Con",
  spouse: "Vợ/chồng",
};

const relationshipTypeLabels: Record<string, string> = {
  marriage: "Hôn phối",
  biological_child: "Con ruột",
  adopted_child: "Con nuôi",
};

const getProposalName = (proposal: RelationshipAdditionProposal) =>
  proposal.target_new_person?.full_name ||
  proposal.target_person_name ||
  proposal.target_person_id ||
  "Chưa rõ tên";

const getProposalGender = (proposal: RelationshipAdditionProposal) =>
  proposal.target_new_person?.gender
    ? genderLabels[proposal.target_new_person.gender]
    : "-";

const getProposalBirth = (proposal: RelationshipAdditionProposal) => {
  const target = proposal.target_new_person;
  if (!target) return "-";
  return target.birth_date_text || target.birth_year?.toString() || "-";
};

const getProposalNote = (proposal: RelationshipAdditionProposal) =>
  proposal.target_new_person?.note || proposal.note || "-";

const getProposalInLawStatus = (proposal: RelationshipAdditionProposal) => {
  if (!proposal.target_new_person) return "-";
  return proposal.target_new_person.is_in_law ? "Có" : "Không";
};

const getRelationshipLabel = (proposal: RelationshipAdditionProposal) => {
  const direction = directionLabels[proposal.direction] || proposal.direction;
  const relationshipType =
    relationshipTypeLabels[proposal.relationship_type] ||
    proposal.relationship_type;

  return `${direction} · ${relationshipType}`;
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const getDraftNodeClasses = (gender?: string) => {
  if (gender === "male") return "border-sky-200 bg-sky-50 text-sky-900";
  if (gender === "female") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-stone-200 bg-white text-stone-900";
};

interface DraftPersonNodeProps {
  label: string;
  name: string;
  gender?: string;
  meta?: string;
}

function DraftPersonNode({ label, name, gender, meta }: DraftPersonNodeProps) {
  return (
    <div
      className={`min-w-0 rounded-lg border px-3 py-2 shadow-sm ${getDraftNodeClasses(gender)}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-stone-700 ring-1 ring-inset ring-stone-200">
          {getInitials(name) || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          {meta && <p className="truncate text-xs text-stone-500">{meta}</p>}
        </div>
      </div>
    </div>
  );
}

function DraftRelationshipEdges({
  anchorName,
  proposals,
}: {
  anchorName: string;
  proposals: RelationshipAdditionProposal[];
}) {
  return (
    <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Sơ đồ liên kết đề xuất
      </p>
      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
        {proposals.map((proposal, index) => (
          <div
            key={`${getProposalName(proposal)}-edge-${index}`}
            className="flex flex-wrap items-center gap-2 text-xs text-stone-700"
          >
            <span className="rounded-full bg-white px-2 py-1 font-semibold text-stone-900 ring-1 ring-stone-200">
              {anchorName}
            </span>
            <ArrowRight className="size-3.5 text-stone-400" />
            <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
              {getRelationshipLabel(proposal)}
            </span>
            <ArrowRight className="size-3.5 text-stone-400" />
            <span className="rounded-full bg-white px-2 py-1 font-semibold text-stone-900 ring-1 ring-stone-200">
              {getProposalName(proposal)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelationshipDraftReview({ item }: { item: AdditionalDataRequestItem }) {
  const relationshipAdditions = item.request_payload.relationship_additions || [];

  if (relationshipAdditions.length === 0) {
    return null;
  }

  const spouses = relationshipAdditions.filter(
    (proposal) => proposal.direction === "spouse",
  );
  const children = relationshipAdditions.filter(
    (proposal) => proposal.direction === "child",
  );
  const parents = relationshipAdditions.filter(
    (proposal) => proposal.direction === "parent",
  );

  return (
    <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <GitBranch className="size-4 text-amber-700" />
            Bản nháp quan hệ gia phả
          </div>
          <p className="mt-1 text-xs text-stone-600">
            Xem nhanh các quan hệ sẽ được tạo khi phê duyệt yêu cầu này.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">
          <UserPlus className="size-3.5" />
          {relationshipAdditions.length} đề xuất
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <DraftPersonNode
            label="Người gốc"
            name={item.person_name}
            meta={[
              item.person_generation != null
                ? `Đời thứ ${item.person_generation}`
                : null,
              item.person_branch || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />

          {spouses.length > 0 && (
            <>
              <div className="hidden items-center justify-center text-rose-500 lg:flex">
                <Heart className="size-5 fill-rose-100" />
              </div>
              <div className="space-y-2">
                {spouses.map((proposal, index) => (
                  <DraftPersonNode
                    key={`${proposal.person_a}-${proposal.person_b}-${index}`}
                    label="Vợ/chồng đề xuất"
                    name={getProposalName(proposal)}
                    gender={proposal.target_new_person?.gender}
                    meta={getProposalBirth(proposal)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {parents.length > 0 && (
          <div className="mt-3 border-t border-dashed border-stone-200 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Cha/mẹ đề xuất
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {parents.map((proposal, index) => (
                <DraftPersonNode
                  key={`${proposal.person_a}-${proposal.person_b}-parent-${index}`}
                  label={getRelationshipLabel(proposal)}
                  name={getProposalName(proposal)}
                  gender={proposal.target_new_person?.gender}
                  meta={getProposalBirth(proposal)}
                />
              ))}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div className="mt-3 border-t border-dashed border-stone-200 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Con đề xuất
              </p>
              <span className="text-xs text-stone-500">
                {children.length} người
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {children.map((proposal, index) => (
                  <DraftPersonNode
                    key={`${proposal.person_a}-${proposal.person_b}-child-${index}`}
                    label={getRelationshipLabel(proposal)}
                    name={getProposalName(proposal)}
                    gender={proposal.target_new_person?.gender}
                    meta={getProposalBirth(proposal)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <DraftRelationshipEdges
          anchorName={item.person_name}
          proposals={relationshipAdditions}
        />
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2 text-sm font-semibold text-stone-900">
          <ListChecks className="size-4 text-emerald-700" />
          Danh sách người/quan hệ đề xuất
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100 text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Họ tên</th>
                <th className="px-3 py-2 font-semibold">Quan hệ</th>
                <th className="px-3 py-2 font-semibold">Giới tính</th>
                <th className="px-3 py-2 font-semibold">Năm/ngày sinh</th>
                <th className="px-3 py-2 font-semibold">Dâu/rể</th>
                <th className="px-3 py-2 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {relationshipAdditions.map((proposal, index) => (
                <tr key={`${getProposalName(proposal)}-${index}`}>
                  <td className="px-3 py-2 font-medium text-stone-900">
                    {getProposalName(proposal)}
                    {proposal.target_is_new && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Người mới
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-stone-700">
                    {getRelationshipLabel(proposal)}
                  </td>
                  <td className="px-3 py-2 text-stone-700">
                    {getProposalGender(proposal)}
                  </td>
                  <td className="px-3 py-2 text-stone-700">
                    {getProposalBirth(proposal)}
                  </td>
                  <td className="px-3 py-2 text-stone-700">
                    {getProposalInLawStatus(proposal)}
                  </td>
                  <td className="max-w-sm px-3 py-2 text-stone-700">
                    {getProposalNote(proposal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-stone-600">
        <Users className="mt-0.5 size-3.5 shrink-0 text-stone-400" />
        Đây là bản nháp để rà soát trước khi phê duyệt; dữ liệu chỉ được ghi vào
        gia phả sau khi bấm phê duyệt.
      </p>
    </section>
  );
}

export default function AdditionalDataRequestsList({
  initialRequests,
}: AdditionalDataRequestsListProps) {
  const [requests, setRequests] = useState<AdditionalDataRequestItem[]>(
    initialRequests,
  );
  const [notification, setNotification] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [generationFilter, setGenerationFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  const updateRequestLocally = (
    requestId: string,
    patch: Partial<AdditionalDataRequestItem>,
  ) => {
    setRequests((prev) =>
      prev.map((item) => (item.id === requestId ? { ...item, ...patch } : item)),
    );
  };

  const handleApprove = async (requestId: string) => {
    setLoadingId(requestId);
    const result = await approveAdditionalDataRequest(requestId);

    if (result?.error) {
      showNotification(result.error);
      setLoadingId(null);
      return;
    }

    updateRequestLocally(requestId, {
      status: "approved",
      reviewed_at: result?.reviewedAt ?? new Date().toISOString(),
      decision_note: null,
    });
    showNotification("Đã phê duyệt yêu cầu.");
    setLoadingId(null);
  };

  const handleReject = async (requestId: string) => {
    const note = window.prompt("Nhập ghi chú từ chối (không bắt buộc):");
    setLoadingId(requestId);
    const result = await rejectAdditionalDataRequest(requestId, note);

    if (result?.error) {
      showNotification(result.error);
      setLoadingId(null);
      return;
    }

    updateRequestLocally(requestId, {
      status: "rejected",
      reviewed_at: result?.reviewedAt ?? new Date().toISOString(),
      decision_note: note || null,
    });
    showNotification("Đã từ chối yêu cầu.");
    setLoadingId(null);
  };

  const generationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          requests
            .map((item) => item.person_generation)
            .filter((value): value is number => Number.isInteger(value)),
        ),
      ).sort((a, b) => a - b),
    [requests],
  );

  const branchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          requests
            .map((item) => item.person_branch?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    const normalizedSearch = normalizeForSearch(searchTerm);
    const selectedGeneration =
      generationFilter === "all" ? null : Number(generationFilter);

    return requests.filter((item) => {
      if (
        selectedGeneration !== null &&
        (item.person_generation ?? null) !== selectedGeneration
      ) {
        return false;
      }

      if (
        branchFilter !== "all" &&
        (item.person_branch?.trim() || "") !== branchFilter
      ) {
        return false;
      }

      if (!normalizedSearch) return true;
      return buildSearchText(item).includes(normalizedSearch);
    });
  }, [branchFilter, generationFilter, requests, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedRequests = filteredRequests.slice(pageStart, pageStart + PAGE_SIZE);

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Chưa có yêu cầu bổ sung dữ liệu nào.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm">
          {notification}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tên người, người gửi, nội dung thay đổi..."
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Lọc theo đời
            </label>
            <select
              value={generationFilter}
              onChange={(event) => {
                setGenerationFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">Tất cả đời</option>
              {generationOptions.map((generation) => (
                <option key={generation} value={generation}>
                  Đời thứ {generation}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Lọc theo nhánh
            </label>
            <select
              value={branchFilter}
              onChange={(event) => {
                setBranchFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">Tất cả nhánh</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-xs text-stone-500">
          Hiển thị {paginatedRequests.length} / {filteredRequests.length} yêu cầu
          (tổng {requests.length}).
        </p>
      </section>

      {paginatedRequests.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
          Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại.
        </div>
      )}

      {paginatedRequests.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-stone-900">
                {item.person_name}
              </h3>
              <p className="text-xs text-stone-500">
                Mã yêu cầu: <span className="font-mono">{item.id}</span>
              </p>
              <p className="text-xs text-stone-500">
                {item.person_generation != null
                  ? `Đời thứ ${item.person_generation}`
                  : "Chưa rõ đời"}
                {item.person_branch ? ` • ${item.person_branch}` : ""}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[item.status] ?? "bg-stone-100 text-stone-700 border-stone-200"}`}
            >
              {statusLabels[item.status] ?? item.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-stone-700 sm:grid-cols-2">
            <p>
              <span className="font-semibold">Người gửi:</span>{" "}
              {item.submitter_name}
            </p>
            <p>
              <span className="font-semibold">Thời gian gửi:</span>{" "}
              {formatDate(item.created_at)}
            </p>
            <p className="sm:col-span-2">
              <span className="font-semibold">Các trường thay đổi:</span>{" "}
              {formatChangedFields(item)}
            </p>
            {item.request_payload.submitter_note && (
              <p className="sm:col-span-2">
                <span className="font-semibold">Ghi chú người gửi:</span>{" "}
                {item.request_payload.submitter_note}
              </p>
            )}
            {item.reviewed_at && (
              <p>
                <span className="font-semibold">Thời gian xử lý:</span>{" "}
                {formatDate(item.reviewed_at)}
              </p>
            )}
            {item.decision_note && (
              <p className="sm:col-span-2">
                <span className="font-semibold">Ghi chú xử lý:</span>{" "}
                {item.decision_note}
              </p>
            )}
          </div>

          <RelationshipDraftReview item={item} />

          <details className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-stone-700">
              Xem dữ liệu kỹ thuật (JSON)
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-stone-700">
              {JSON.stringify(item.request_payload, null, 2)}
            </pre>
          </details>

          {item.status === "pending" && (
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => handleReject(item.id)}
                disabled={loadingId === item.id}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => handleApprove(item.id)}
                disabled={loadingId === item.id}
                className="rounded-xl border border-emerald-500 bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                Phê duyệt
              </button>
            </div>
          )}
        </article>
      ))}

      {filteredRequests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-stone-600">
            Trang {safeCurrentPage} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trang trước
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={safeCurrentPage >= totalPages}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

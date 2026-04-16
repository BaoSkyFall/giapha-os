"use client";

import {
  approveAdditionalDataRequest,
  rejectAdditionalDataRequest,
} from "@/app/actions/additional-data-request";
import { AdditionalDataRequestItem } from "@/types";
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

          <details className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-stone-700">
              Xem chi tiết nội dung đề xuất
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

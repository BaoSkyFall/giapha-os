"use client";

import { deleteCustomEvent } from "@/app/actions/custom-event";
import CustomEventModal from "@/components/CustomEventModal";
import { CustomEventRecord } from "@/utils/eventHelpers";
import { matchesSearchQuery } from "@/utils/textSearch";
import {
  CalendarDays,
  Edit3,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface AdminEventsManagerProps {
  initialEvents: CustomEventRecord[];
}

type EventStatus = "draft" | "published";
type EventStatusFilter = "all" | EventStatus;

function normalizeEventStatus(status: CustomEventRecord["status"]): EventStatus {
  return status === "draft" ? "draft" : "published";
}

function formatEventDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN");
}

function getStatusLabel(status: EventStatus): string {
  return status === "draft" ? "Draft" : "Published";
}

export default function AdminEventsManager({
  initialEvents,
}: AdminEventsManagerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CustomEventRecord | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sortedEvents = useMemo(() => {
    return [...initialEvents].sort((a, b) => {
      if (a.event_date !== b.event_date) {
        return a.event_date.localeCompare(b.event_date);
      }
      return a.name.localeCompare(b.name, "vi");
    });
  }, [initialEvents]);

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((event) => {
      const eventStatus = normalizeEventStatus(event.status);
      if (statusFilter !== "all" && eventStatus !== statusFilter) {
        return false;
      }

      return matchesSearchQuery(
        [event.name, event.location, event.content, event.event_date, eventStatus],
        searchTerm,
      );
    });
  }, [searchTerm, sortedEvents, statusFilter]);

  const handleOpenCreate = () => {
    setDeleteError(null);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (event: CustomEventRecord) => {
    setDeleteError(null);
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDelete = async (event: CustomEventRecord) => {
    if (!window.confirm(`Xóa sự kiện "${event.name}"?`)) return;

    setDeleteError(null);
    setDeletingId(event.id);
    try {
      const result = await deleteCustomEvent(event.id);
      if ("error" in result && result.error) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setDeleteError(error.message || "Không thể xóa sự kiện.");
      } else {
        setDeleteError("Không thể xóa sự kiện.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:max-w-2xl sm:flex-row">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo tên, địa điểm, nội dung, ngày..."
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter((event.target.value as EventStatusFilter) || "all")
              }
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 sm:w-44"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-heritage-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9F1717]"
          >
            <Plus className="size-4" />
            Thêm sự kiện
          </button>
        </div>

        <p className="mt-3 text-xs text-stone-500">
          Hiển thị <span className="font-semibold">{filteredEvents.length}</span> /{" "}
          <span className="font-semibold">{initialEvents.length}</span> sự kiện
        </p>

        {deleteError ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {deleteError}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-sm">
        {filteredEvents.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-stone-500">
            Không có sự kiện phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredEvents.map((event) => {
              const eventStatus = normalizeEventStatus(event.status);

              return (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="break-words text-base font-semibold text-stone-800">
                      {event.name}
                    </p>

                    <span
                      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        eventStatus === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {getStatusLabel(eventStatus)}
                    </span>

                    <p className="inline-flex items-center gap-1.5 text-sm text-stone-600">
                      <CalendarDays className="size-4 text-stone-400" />
                      {formatEventDate(event.event_date)}
                    </p>

                    {event.location ? (
                      <p className="inline-flex items-center gap-1.5 text-sm text-stone-600">
                        <MapPin className="size-4 text-stone-400" />
                        <span className="break-words">{event.location}</span>
                      </p>
                    ) : null}

                    {event.content ? (
                      <p className="line-clamp-2 break-words text-sm text-stone-500">
                        {event.content}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(event)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-amber-300 hover:text-amber-700"
                    >
                      <Edit3 className="size-3.5" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(event)}
                      disabled={deletingId === event.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="size-3.5" />
                      {deletingId === event.id ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.refresh()}
        eventToEdit={editingEvent}
      />
    </div>
  );
}

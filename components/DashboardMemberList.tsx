"use client";

import PersonCard from "@/components/PersonCard";
import { Person } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useDashboard } from "./DashboardContext";

interface DashboardMemberListProps {
  initialPersons: Person[];
  canEdit?: boolean;
  currentSearchTerm?: string;
  currentFilterOption?: string;
  currentSortOption?: string;
  currentGenerationFilter?: string;
  currentBranchFilter?: string;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
}

export default function DashboardMemberList({
  initialPersons,
  canEdit = false,
  currentSearchTerm = "",
  currentFilterOption = "all",
  currentSortOption = "updated_desc",
  currentGenerationFilter = "",
  currentBranchFilter = "",
  currentPage = 1,
  pageSize = 24,
  totalCount = 0,
}: DashboardMemberListProps) {
  const { setShowCreateMember } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearchTerm);
  const [generationInput, setGenerationInput] = useState(currentGenerationFilter);
  const [branchInput, setBranchInput] = useState(currentBranchFilter);

  useEffect(() => {
    setSearchInput(currentSearchTerm);
  }, [currentSearchTerm]);

  useEffect(() => {
    setGenerationInput(currentGenerationFilter);
  }, [currentGenerationFilter]);

  useEffect(() => {
    setBranchInput(currentBranchFilter);
  }, [currentBranchFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safeCurrentPage, totalPages]);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(overrides)) {
      if (value && value.trim().length > 0) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const navigate = (url: string) => {
    startTransition(() => router.push(url));
  };

  const updateListParams = (
    overrides: Record<string, string | undefined>,
    resetPage = false,
  ) => {
    const merged: Record<string, string | undefined> = { ...overrides };
    if (resetPage) {
      merged.listPage = "1";
    }
    navigate(buildUrl(merged));
  };

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      updateListParams({ listPage: String(safeCurrentPage) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, safeCurrentPage]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = searchInput.trim();
    if (normalized === currentSearchTerm) return;
    updateListParams({ listSearch: normalized || undefined }, true);
  };

  const handleFilterChange = (value: string) => {
    updateListParams({ listFilter: value === "all" ? undefined : value }, true);
  };

  const handleSortChange = (value: string) => {
    updateListParams({ listSort: value === "updated_desc" ? undefined : value }, true);
  };

  const applyAdvancedFilters = () => {
    const generationTrimmed = generationInput.trim();
    const parsedGeneration = Number.parseInt(generationTrimmed, 10);
    const generationValue =
      generationTrimmed.length > 0 &&
      Number.isFinite(parsedGeneration) &&
      parsedGeneration > 0
        ? String(parsedGeneration)
        : undefined;

    updateListParams(
      {
        listGeneration: generationValue,
        listBranch: branchInput.trim() || undefined,
      },
      true,
    );
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) return;
    updateListParams({ listPage: String(page) });
  };

  const hasActiveFilters =
    currentSearchTerm.trim().length > 0 ||
    currentFilterOption !== "all" ||
    currentGenerationFilter.trim().length > 0 ||
    currentBranchFilter.trim().length > 0;

  return (
    <div className={isPending ? "opacity-70 transition-opacity" : undefined}>
      <div className="mb-8 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200/60 transition-all duration-300 relative z-10 w-full">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto flex-1">
            <form
              className="relative flex-1 max-w-sm group"
              onSubmit={(event) => void handleSearchSubmit(event)}
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm thành viên..."
                className="bg-white/90 text-stone-900 w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200/80 shadow-sm placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </form>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto items-center">
              <div className="relative w-full sm:w-auto">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                <select
                  className="appearance-none bg-white/90 text-stone-700 w-full sm:w-40 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 hover:border-amber-300 font-medium text-sm transition-all focus:bg-white"
                  value={currentFilterOption}
                  onChange={(event) => handleFilterChange(event.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="in_law_female">Dâu</option>
                  <option value="in_law_male">Rể</option>
                  <option value="deceased">Đã mất</option>
                  <option value="first_child">Con trưởng</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg
                    className="size-4 text-stone-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>

              <div className="relative w-full sm:w-auto">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                <select
                  className="appearance-none bg-white/90 text-stone-700 w-full sm:w-52 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 hover:border-amber-300 font-medium text-sm transition-all focus:bg-white"
                  value={currentSortOption}
                  onChange={(event) => handleSortChange(event.target.value)}
                >
                  <option value="birth_asc">Năm sinh (Tăng dần)</option>
                  <option value="birth_desc">Năm sinh (Giảm dần)</option>
                  <option value="name_asc">Tên (A-Z)</option>
                  <option value="name_desc">Tên (Z-A)</option>
                  <option value="updated_desc">Cập nhật (Mới nhất)</option>
                  <option value="updated_asc">Cập nhật (Cũ nhất)</option>
                  <option value="generation_asc">Theo thế hệ (Tăng dần)</option>
                  <option value="generation_desc">Theo thế hệ (Giảm dần)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg
                    className="size-4 text-stone-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>

              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="w-full sm:w-28 bg-white/90 text-stone-700 px-3 py-2.5 rounded-xl border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 text-sm"
                placeholder="Đời"
                value={generationInput}
                onChange={(event) => setGenerationInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyAdvancedFilters();
                  }
                }}
              />

              <input
                type="text"
                className="w-full sm:w-36 bg-white/90 text-stone-700 px-3 py-2.5 rounded-xl border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 text-sm"
                placeholder="Chi / Nhánh"
                value={branchInput}
                onChange={(event) => setBranchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyAdvancedFilters();
                  }
                }}
              />

              <button
                type="button"
                onClick={applyAdvancedFilters}
                className="w-full sm:w-auto rounded-xl border border-heritage-gold/30 bg-white px-4 py-2.5 text-sm font-semibold text-heritage-red transition-colors hover:bg-rice-paper"
              >
                Lọc
              </button>
            </div>
          </div>

          {canEdit && (
            <button onClick={() => setShowCreateMember(true)} className="btn-primary">
              <Plus className="size-4" strokeWidth={2.5} />
              Thêm thành viên
            </button>
          )}
        </div>
      </div>

      {initialPersons.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialPersons.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-stone-200/60 bg-white/70 px-4 py-3">
            <p className="text-sm text-stone-600">
              Hiển thị <span className="font-semibold">{initialPersons.length}</span> /{" "}
              <span className="font-semibold">{totalCount}</span> thành viên
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className="size-8 flex items-center justify-center rounded border border-stone-200 bg-white text-stone-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
                aria-label="Trang trước"
              >
                <ArrowLeft className="size-4" />
              </button>

              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`size-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                    page === safeCurrentPage
                      ? "border border-heritage-red bg-heritage-red text-white"
                      : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className="size-8 flex items-center justify-center rounded border border-stone-200 bg-white text-stone-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
                aria-label="Trang sau"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-stone-400 italic">
          {hasActiveFilters
            ? "Không tìm thấy thành viên phù hợp."
            : "Chưa có thành viên nào. Hãy thêm thành viên đầu tiên."}
        </div>
      )}
    </div>
  );
}


"use client";

import { useDashboard } from "@/components/DashboardContext";
import DashboardMemberList from "@/components/DashboardMemberList";
import RootSelector from "@/components/RootSelector";
import { Person, Relationship } from "@/types";
import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"));
const MindmapTree = dynamic(() => import("@/components/MindmapTree"));

const FOUNDER_ROOT_ID = "0911c310-31cd-43c2-a705-67770bd074df";
const HEAVY_ROOT_IDS = new Set(["0911c310-31cd-43c2-a705-67770bd074df", "fc22c7b0-5e7a-4c13-977e-0cdcc29cd5fa", "2a15f9c1-47a8-4106-85e8-1f223725e124"]);

interface DashboardViewsProps {
  persons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
  listPersons?: Person[];
  listQueryState?: {
    searchTerm: string;
    filterOption: string;
    sortOption: string;
    generationFilter: string;
    branchFilter: string;
    page: number;
    pageSize: number;
    total: number;
  };
}

export default function DashboardViews({
  persons,
  relationships,
  canEdit = false,
  listPersons,
  listQueryState,
}: DashboardViewsProps) {
  const {
    view: currentView,
    rootId,
    setRootId,
    isViewLoading,
    memberMutation,
  } = useDashboard();
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [livePersons, setLivePersons] = useState<Person[]>(persons);
  const [liveListPersons, setLiveListPersons] = useState<Person[]>(
    listPersons ?? persons,
  );
  const [liveListTotal, setLiveListTotal] = useState<number>(
    listQueryState?.total ?? (listPersons ?? persons).length,
  );

  useEffect(() => {
    setLivePersons(persons);
  }, [persons]);

  useEffect(() => {
    const nextListPersons = listPersons ?? persons;
    setLiveListPersons(nextListPersons);
    setLiveListTotal(listQueryState?.total ?? nextListPersons.length);
  }, [listPersons, persons, listQueryState?.total]);

  useEffect(() => {
    if (!memberMutation || memberMutation.kind !== "upsert") return;
    const updatedPerson = memberMutation.person;

    setLivePersons((prev) => {
      const idx = prev.findIndex((person) => person.id === updatedPerson.id);
      if (idx === -1) return [updatedPerson, ...prev];
      if (prev[idx] === updatedPerson) return prev;
      const next = [...prev];
      next[idx] = updatedPerson;
      return next;
    });

    setLiveListPersons((prev) => {
      const idx = prev.findIndex((person) => person.id === updatedPerson.id);
      if (idx === -1) {
        return [updatedPerson, ...prev];
      }
      if (prev[idx] === updatedPerson) return prev;
      const next = [...prev];
      next[idx] = updatedPerson;
      return next;
    });

    if (memberMutation.source === "modal-create") {
      setLiveListTotal((prev) => prev + 1);
    }
  }, [memberMutation]);

  const personsMap = useMemo(() => {
    const map = new Map<string, Person>();
    for (const person of livePersons) {
      map.set(person.id, person);
    }
    return map;
  }, [livePersons]);

  const selectedRoot = useMemo(() => {
    if (!rootId) return null;
    return personsMap.get(rootId) ?? null;
  }, [personsMap, rootId]);

  const selectedRootChildCount = useMemo(() => {
    if (!rootId) return 0;
    return relationships.filter(
      (relationship) =>
        (relationship.type === "biological_child" ||
          relationship.type === "adopted_child") &&
        relationship.person_a === rootId,
    ).length;
  }, [relationships, rootId]);

  const resolveUpperRoot = useCallback(
    (personId: string): Person | null => {
    const parentLinks = relationships.filter(
      (relationship) =>
        (relationship.type === "biological_child" ||
          relationship.type === "adopted_child") &&
        relationship.person_b === personId,
    );
    if (parentLinks.length === 0) return null;

    const parentCandidates = parentLinks
      .map((link) => {
        const person = personsMap.get(link.person_a);
        if (!person) return null;
        return { person, relationType: link.type };
      })
      .filter(
        (
          value,
        ): value is {
          person: Person;
          relationType: Relationship["type"];
        } => value !== null,
      )
      .sort((a, b) => {
        if (a.relationType !== b.relationType) {
          return a.relationType === "biological_child" ? -1 : 1;
        }

        if (a.person.is_in_law !== b.person.is_in_law) {
          return a.person.is_in_law ? 1 : -1;
        }

        const aGeneration = a.person.generation ?? Number.MAX_SAFE_INTEGER;
        const bGeneration = b.person.generation ?? Number.MAX_SAFE_INTEGER;
        if (aGeneration !== bGeneration) return aGeneration - bGeneration;

        const aYear = a.person.birth_year ?? Number.MAX_SAFE_INTEGER;
        const bYear = b.person.birth_year ?? Number.MAX_SAFE_INTEGER;
        if (aYear !== bYear) return aYear - bYear;

        return a.person.id.localeCompare(b.person.id);
      });

    return parentCandidates[0]?.person ?? null;
  }, [personsMap, relationships]);

  const selectedRootUpperRoot = useMemo(() => {
    if (!selectedRoot) return null;
    return resolveUpperRoot(selectedRoot.id);
  }, [resolveUpperRoot, selectedRoot]);

  const contextRoot = useMemo(() => {
    if (!selectedRoot) return null;
    if (selectedRootChildCount > 1 || !selectedRootUpperRoot) return selectedRoot;
    return selectedRootUpperRoot;
  }, [selectedRootUpperRoot, selectedRoot, selectedRootChildCount]);

  const contextUpperRoot = useMemo(() => {
    if (!contextRoot) return null;
    return resolveUpperRoot(contextRoot.id);
  }, [contextRoot, resolveUpperRoot]);

  const roots = contextRoot ? [contextRoot] : [];
  const isTreeMode = currentView === "tree" || currentView === "mindmap";
  const shouldRequireRoot = isTreeMode && !isViewLoading;
  const showMissingRootHint = shouldRequireRoot && !rootId;
  const showInvalidRootHint = shouldRequireRoot && Boolean(rootId) && !selectedRoot;
  const showContextRootHint =
    shouldRequireRoot &&
    Boolean(selectedRoot) &&
    Boolean(contextRoot) &&
    selectedRoot?.id !== contextRoot?.id;
  const showGoUpperArrow =
    shouldRequireRoot &&
    Boolean(contextRoot) &&
    Boolean(contextUpperRoot) &&
    contextRoot?.id !== FOUNDER_ROOT_ID;
  const showHeavyRootWarning =
    shouldRequireRoot &&
    Boolean(contextRoot?.id) &&
    HEAVY_ROOT_IDS.has(contextRoot?.id ?? "");

  useEffect(() => {
    if (!isTreeMode || !rootId) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [isTreeMode, rootId]);

  return (
    <>
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-rice-paper/50 flex flex-col"
      >
        {!isViewLoading && currentView !== "list" && livePersons.length > 0 && (
          <div className="sticky top-0 z-30 w-full border-b border-stone-200/70 bg-rice-paper/95 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-3 w-full flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-4 relative z-20">
                <div className="flex items-center gap-2">
                  <RootSelector persons={livePersons} currentRootId={rootId} />
                </div>
                <div
                  id="tree-toolbar-portal"
                  className="flex items-center gap-2 flex-wrap justify-center"
                />
              </div>

              {showHeavyRootWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Gốc hiển thị này làm cây gia phả lớn và web load chậm. Nếu thấy giật lag, vui lòng đổi gốc hiển thị nhỏ hơn.
                  </p>
                </div>
              )}

              {showContextRootHint && selectedRoot && contextRoot && (
                <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Đang hiển thị ngữ cảnh gia đình của <strong>{selectedRoot.full_name}</strong> từ nhánh cha/mẹ: <strong>{contextRoot.full_name}</strong>.
                  </p>
                </div>
              )}

              {showMissingRootHint && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>Vui lòng chọn Gốc hiển thị để hiển thị gia phả.</p>
                </div>
              )}

              {showInvalidRootHint && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  <p>Gốc hiển thị đã lưu không còn hợp lệ trong danh sách hiện tại.</p>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    onClick={() => setRootId(null)}
                  >
                    Xóa root
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isViewLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
            <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-6 py-10 text-center shadow-sm">
              <div className="mx-auto mb-3 size-8 rounded-full border-2 border-heritage-red border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-stone-600">Đang tải dữ liệu...</p>
            </div>
          </div>
        )}

        {!isViewLoading && currentView === "list" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full relative z-10">
            <DashboardMemberList
              initialPersons={liveListPersons}
              canEdit={canEdit}
              currentSearchTerm={listQueryState?.searchTerm}
              currentFilterOption={listQueryState?.filterOption}
              currentSortOption={listQueryState?.sortOption}
              currentGenerationFilter={listQueryState?.generationFilter}
              currentBranchFilter={listQueryState?.branchFilter}
              currentPage={listQueryState?.page}
              pageSize={listQueryState?.pageSize}
              totalCount={liveListTotal}
            />
          </div>
        )}

        {!isViewLoading &&
          currentView !== "list" &&
          !showMissingRootHint &&
          !showInvalidRootHint && (
            <div className="flex-1 w-full relative z-10">
              {currentView === "tree" && (
                <FamilyTree
                  personsMap={personsMap}
                  relationships={relationships}
                  roots={roots}
                  upperRoot={showGoUpperArrow ? contextUpperRoot : null}
                  onChangeRoot={setRootId}
                  canEdit={canEdit}
                />
              )}
              {currentView === "mindmap" && (
                <MindmapTree
                  personsMap={personsMap}
                  relationships={relationships}
                  roots={roots}
                  upperRoot={showGoUpperArrow ? contextUpperRoot : null}
                  onChangeRoot={setRootId}
                  canEdit={canEdit}
                />
              )}
            </div>
          )}
      </main>
    </>
  );
}

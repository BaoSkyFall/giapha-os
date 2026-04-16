"use client";

import { useDashboard } from "@/components/DashboardContext";
import DashboardMemberList from "@/components/DashboardMemberList";
import RootSelector from "@/components/RootSelector";
import { Person, Relationship } from "@/types";
import { useMemo } from "react";
import dynamic from "next/dynamic";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"));
const MindmapTree = dynamic(() => import("@/components/MindmapTree"));

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
  const { view: currentView, rootId, isViewLoading } = useDashboard();

  // Prepare map and roots for tree views
  const { personsMap, roots, defaultRootId } = useMemo(() => {
    const pMap = new Map<string, Person>();
    persons.forEach((p) => pMap.set(p.id, p));

    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === "biological_child" || r.type === "adopted_child",
        )
        .map((r) => r.person_b),
    );

    let finalRootId = rootId;

    // If no rootId is provided, fallback to the earliest created person
    if (!finalRootId || !pMap.has(finalRootId)) {
      const rootsFallback = persons.filter((p) => !childIds.has(p.id));
      // Prefer non-in-law roots (actual blood ancestors), fall back to any root
      const preferredRoot =
        rootsFallback.find((p) => !p.is_in_law) ?? rootsFallback[0];
      if (preferredRoot) {
        finalRootId = preferredRoot.id;
      } else if (persons.length > 0) {
        finalRootId = persons[0].id; // ultimate fallback
      }
    }

    let calculatedRoots: Person[] = [];
    if (finalRootId && pMap.has(finalRootId)) {
      calculatedRoots = [pMap.get(finalRootId)!];
    }

    return {
      personsMap: pMap,
      roots: calculatedRoots,
      defaultRootId: finalRootId,
    };
  }, [persons, relationships, rootId]);

  const activeRootId = rootId || defaultRootId;

  return (
    <>
      <main className="flex-1 overflow-auto bg-rice-paper/50 flex flex-col">
        {!isViewLoading && currentView !== "list" && persons.length > 0 && activeRootId && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 w-full flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-4 relative z-20">
            <RootSelector persons={persons} currentRootId={activeRootId} />
            <div
              id="tree-toolbar-portal"
              className="flex items-center gap-2 flex-wrap justify-center"
            />
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
              initialPersons={listPersons ?? persons}
              canEdit={canEdit}
              currentSearchTerm={listQueryState?.searchTerm}
              currentFilterOption={listQueryState?.filterOption}
              currentSortOption={listQueryState?.sortOption}
              currentGenerationFilter={listQueryState?.generationFilter}
              currentBranchFilter={listQueryState?.branchFilter}
              currentPage={listQueryState?.page}
              pageSize={listQueryState?.pageSize}
              totalCount={listQueryState?.total}
            />
          </div>
        )}

        {!isViewLoading && <div className="flex-1 w-full relative z-10">
          {currentView === "tree" && (
            <FamilyTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
          {currentView === "mindmap" && (
            <MindmapTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
        </div>}
      </main>
    </>
  );
}

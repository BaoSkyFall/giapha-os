import type { Person, Relationship } from "@/types";

export interface SpouseEdge {
  person: Person;
  note?: string | null;
  relationshipId: string;
}

export interface ChildEdge {
  person: Person;
  type: "biological_child" | "adopted_child";
  relationshipId: string;
}

export interface GraphDiagnostics {
  personsInLoadedGraph: number;
  relationshipsInLoadedGraph: number;
  danglingRelations: number;
  duplicateRelations: number;
  selfParentErrors: number;
  cycleCount: number;
  orphanCount: number;
}

export interface NormalizedFamilyGraph {
  personsById: Map<string, Person>;
  spousesByPersonId: Map<string, SpouseEdge[]>;
  childrenByPersonId: Map<string, ChildEdge[]>;
  parentsByPersonId: Map<string, Person[]>;
  diagnostics: GraphDiagnostics;
}

export interface SubgraphFilterOptions {
  rootIds: string[];
  /** null = toàn bộ các đời từ root; 1 = chỉ root; 2 = 2 đời; 3 = 3 đời */
  maxDepth: number | null;
  hideSpouses: boolean;
  hideMales: boolean;
  hideFemales: boolean;
  collapsedNodeIds?: Set<string>;
}

export interface VisibleFamilyUnit {
  primaryId: string;
  spouseIds: string[];
  childIds: string[];
  depth: number;
  hasHiddenChildren: boolean;
  hiddenDescendantCount: number;
  hiddenMaxDepth: number;
}

export interface SubgraphMetrics {
  totalPersonsInDatabase: number;
  personsInLoadedGraph: number;
  subgraphUniquePersons: number;
  visibleFamilyUnits: number;
  visibleParentChildRelations: number;
  hiddenByDepth: number;
  hiddenByFilter: number;
  unresolvedRelations: number;
  cycleCount: number;
}

export interface VisibleSubgraph {
  unitsByPrimaryId: Map<string, VisibleFamilyUnit>;
  rootPrimaryIds: string[];
  visiblePersonIds: Set<string>;
  personDepthById: Map<string, number>;
  metrics: SubgraphMetrics;
}

function compareChildren(a: ChildEdge, b: ChildEdge): number {
  const aOrder = a.person.birth_order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.person.birth_order ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;

  const aYear = a.person.birth_year ?? Number.MAX_SAFE_INTEGER;
  const bYear = b.person.birth_year ?? Number.MAX_SAFE_INTEGER;
  if (aYear !== bYear) return aYear - bYear;

  const genderRank = (g: string) => (g === "male" ? 0 : g === "female" ? 1 : 2);
  const gDiff = genderRank(a.person.gender) - genderRank(b.person.gender);
  if (gDiff !== 0) return gDiff;

  return a.person.id.localeCompare(b.person.id);
}

/**
 * Chuẩn hóa dữ liệu thô thành đồ thị gia phả xác định, phát hiện dangling/cycle/orphan.
 */
export function normalizeFamilyGraph(
  persons: Person[],
  relationships: Relationship[],
): NormalizedFamilyGraph {
  const personsById = new Map<string, Person>();
  for (const p of persons) {
    if (p?.id && !personsById.has(p.id)) {
      personsById.set(p.id, p);
    }
  }

  const spousesByPersonId = new Map<string, SpouseEdge[]>();
  const childrenByPersonId = new Map<string, ChildEdge[]>();
  const parentsByPersonId = new Map<string, Person[]>();

  let danglingRelations = 0;
  let duplicateRelations = 0;
  let selfParentErrors = 0;

  const seenMarriagePairs = new Set<string>();
  const seenParentChildPairs = new Set<string>();

  for (const rel of relationships) {
    if (!rel?.person_a || !rel?.person_b) {
      danglingRelations++;
      continue;
    }
    const personA = personsById.get(rel.person_a);
    const personB = personsById.get(rel.person_b);
    if (!personA || !personB) {
      danglingRelations++;
      continue;
    }

    if (rel.type === "marriage") {
      if (rel.person_a === rel.person_b) {
        selfParentErrors++;
        continue;
      }
      const pairKey =
        rel.person_a < rel.person_b
          ? `${rel.person_a}::${rel.person_b}`
          : `${rel.person_b}::${rel.person_a}`;
      if (seenMarriagePairs.has(pairKey)) {
        duplicateRelations++;
        continue;
      }
      seenMarriagePairs.add(pairKey);

      if (!spousesByPersonId.has(rel.person_a)) spousesByPersonId.set(rel.person_a, []);
      if (!spousesByPersonId.has(rel.person_b)) spousesByPersonId.set(rel.person_b, []);

      spousesByPersonId.get(rel.person_a)!.push({
        person: personB,
        note: rel.note,
        relationshipId: rel.id,
      });
      spousesByPersonId.get(rel.person_b)!.push({
        person: personA,
        note: rel.note,
        relationshipId: rel.id,
      });
    } else if (rel.type === "biological_child" || rel.type === "adopted_child") {
      if (rel.person_a === rel.person_b) {
        selfParentErrors++;
        continue;
      }
      const pcKey = `${rel.person_a}->${rel.person_b}`;
      if (seenParentChildPairs.has(pcKey)) {
        duplicateRelations++;
        continue;
      }
      seenParentChildPairs.add(pcKey);

      if (!childrenByPersonId.has(rel.person_a)) childrenByPersonId.set(rel.person_a, []);
      if (!parentsByPersonId.has(rel.person_b)) parentsByPersonId.set(rel.person_b, []);

      childrenByPersonId.get(rel.person_a)!.push({
        person: personB,
        type: rel.type,
        relationshipId: rel.id,
      });
      parentsByPersonId.get(rel.person_b)!.push(personA);
    }
  }

  for (const childList of childrenByPersonId.values()) {
    childList.sort(compareChildren);
  }

  // Detect cycles via DFS
  let cycleCount = 0;
  const color = new Map<string, 0 | 1 | 2>();
  const dfsCycle = (id: string) => {
    color.set(id, 1);
    const children = childrenByPersonId.get(id) ?? [];
    for (const c of children) {
      const cState = color.get(c.person.id) ?? 0;
      if (cState === 1) {
        cycleCount++;
      } else if (cState === 0) {
        dfsCycle(c.person.id);
      }
    }
    color.set(id, 2);
  };
  for (const id of personsById.keys()) {
    if ((color.get(id) ?? 0) === 0) {
      dfsCycle(id);
    }
  }

  // Count orphan nodes (no parents, no children, no spouses)
  let orphanCount = 0;
  for (const id of personsById.keys()) {
    const hasParents = (parentsByPersonId.get(id)?.length ?? 0) > 0;
    const hasChildren = (childrenByPersonId.get(id)?.length ?? 0) > 0;
    const hasSpouses = (spousesByPersonId.get(id)?.length ?? 0) > 0;
    if (!hasParents && !hasChildren && !hasSpouses) {
      orphanCount++;
    }
  }

  return {
    personsById,
    spousesByPersonId,
    childrenByPersonId,
    parentsByPersonId,
    diagnostics: {
      personsInLoadedGraph: personsById.size,
      relationshipsInLoadedGraph: relationships.length,
      danglingRelations,
      duplicateRelations,
      selfParentErrors,
      cycleCount,
      orphanCount,
    },
  };
}

/**
 * Trích xuất subgraph hiển thị theo root, maxDepth (null = toàn bộ) và filter.
 * Bảo đảm không nhân đôi person record làm primary unit và đếm chính xác hiddenByDepth / hiddenByFilter.
 */
export function extractVisibleSubgraph(
  graph: NormalizedFamilyGraph,
  options: SubgraphFilterOptions,
  totalPersonsInDatabase?: number,
): VisibleSubgraph {
  const {
    rootIds,
    maxDepth,
    hideSpouses,
    hideMales,
    hideFemales,
    collapsedNodeIds = new Set<string>(),
  } = options;

  const unitsByPrimaryId = new Map<string, VisibleFamilyUnit>();
  const visiblePersonIds = new Set<string>();
  const personDepthById = new Map<string, number>();
  const rootPrimaryIds: string[] = [];

  const hiddenByDepthIds = new Set<string>();
  const hiddenByFilterIds = new Set<string>();
  let visibleParentChildRelations = 0;

  const passesGenderFilter = (p: Person): boolean => {
    if (hideMales && p.gender === "male") return false;
    if (hideFemales && p.gender === "female") return false;
    return true;
  };

  // BFS từ các rootIds để bảo đảm khoảng cách thế hệ chuẩn (1 = root, 2 = con, 3 = cháu...)
  interface QueueItem {
    personId: string;
    depth: number;
  }

  const queue: QueueItem[] = [];
  // Bảo đảm mỗi canonical person ID chỉ xuất hiện tối đa 1 lần trong cây (dù hôn nhân cận huyết)
  const claimedPersonIds = new Set<string>();

  for (const rid of rootIds) {
    const rootPerson = graph.personsById.get(rid);
    if (!rootPerson) continue;
    if (!passesGenderFilter(rootPerson)) {
      hiddenByFilterIds.add(rid);
      continue;
    }
    if (!claimedPersonIds.has(rid)) {
      claimedPersonIds.add(rid);
      rootPrimaryIds.push(rid);
      queue.push({ personId: rid, depth: 1 });
    }
  }

  // Precompute descendant counts & max depth per person (cycle-safe)
  const memoStats = new Map<string, { count: number; maxDepth: number }>();
  const visitingStats = new Set<string>();
  const getSubtreeStats = (pid: string): { count: number; maxDepth: number } => {
    const cached = memoStats.get(pid);
    if (cached) return cached;
    if (visitingStats.has(pid)) return { count: 0, maxDepth: 0 };
    visitingStats.add(pid);

    const children = graph.childrenByPersonId.get(pid) ?? [];
    let count = 0;
    let maxD = 0;
    for (const ch of children) {
      const spCount = (graph.spousesByPersonId.get(ch.person.id) ?? []).length;
      const sub = getSubtreeStats(ch.person.id);
      count += 1 + spCount + sub.count;
      if (1 + sub.maxDepth > maxD) maxD = 1 + sub.maxDepth;
    }
    visitingStats.delete(pid);
    const res = { count, maxDepth: maxD };
    memoStats.set(pid, res);
    return res;
  };

  let head = 0;
  while (head < queue.length) {
    const { personId, depth } = queue[head++];

    visiblePersonIds.add(personId);
    if (!personDepthById.has(personId)) {
      personDepthById.set(personId, depth);
    }

    // Spouses (cùng thế hệ với primary person, không làm tăng depth)
    const rawSpouses = graph.spousesByPersonId.get(personId) ?? [];
    const spouseIds: string[] = [];
    for (const sp of rawSpouses) {
      if (hideSpouses || !passesGenderFilter(sp.person)) {
        hiddenByFilterIds.add(sp.person.id);
        continue;
      }
      // Không nhân đôi spouse nếu spouse đã xuất hiện ở nhánh khác trong cây
      if (!claimedPersonIds.has(sp.person.id)) {
        claimedPersonIds.add(sp.person.id);
        spouseIds.push(sp.person.id);
        visiblePersonIds.add(sp.person.id);
        if (!personDepthById.has(sp.person.id)) {
          personDepthById.set(sp.person.id, depth);
        }
      }
    }

    // Children
    const rawChildren = graph.childrenByPersonId.get(personId) ?? [];
    const childIds: string[] = [];
    const depthLimitReached = maxDepth !== null && depth >= maxDepth;
    const isCollapsed = collapsedNodeIds.has(personId);
    let hasHiddenChildren = false;

    for (const ch of rawChildren) {
      if (!passesGenderFilter(ch.person)) {
        hiddenByFilterIds.add(ch.person.id);
        continue;
      }
      if (depthLimitReached || isCollapsed) {
        hasHiddenChildren = true;
        if (depthLimitReached) {
          hiddenByDepthIds.add(ch.person.id);
        }
        continue;
      }
      if (claimedPersonIds.has(ch.person.id)) {
        continue;
      }

      claimedPersonIds.add(ch.person.id);
      childIds.push(ch.person.id);
      visibleParentChildRelations++;
      queue.push({ personId: ch.person.id, depth: depth + 1 });
    }

    const subtreeStats = hasHiddenChildren
      ? getSubtreeStats(personId)
      : { count: 0, maxDepth: 0 };

    unitsByPrimaryId.set(personId, {
      primaryId: personId,
      spouseIds,
      childIds,
      depth,
      hasHiddenChildren,
      hiddenDescendantCount: subtreeStats.count,
      hiddenMaxDepth: subtreeStats.maxDepth,
    });
  }

  return {
    unitsByPrimaryId,
    rootPrimaryIds,
    visiblePersonIds,
    personDepthById,
    metrics: {
      totalPersonsInDatabase: totalPersonsInDatabase ?? graph.personsById.size,
      personsInLoadedGraph: graph.personsById.size,
      subgraphUniquePersons: visiblePersonIds.size,
      visibleFamilyUnits: unitsByPrimaryId.size,
      visibleParentChildRelations,
      hiddenByDepth: hiddenByDepthIds.size,
      hiddenByFilter: hiddenByFilterIds.size,
      unresolvedRelations: graph.diagnostics.danglingRelations,
      cycleCount: graph.diagnostics.cycleCount,
    },
  };
}

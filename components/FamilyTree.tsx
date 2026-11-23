"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  ExternalLink,
  Filter,
  GitFork,
  Heart,
  Home,
  Image as ImageIcon,
  Layers,
  ListTree,
  Maximize2,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  User,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Person, Relationship } from "@/types";
import {
  extractVisibleSubgraph,
  normalizeFamilyGraph,
  type NormalizedFamilyGraph,
} from "@/utils/familyGraph";
import {
  computeCompactTreeLayout,
  DEFAULT_LAYOUT_CONFIG,
  type LayoutEdge,
  type PositionedPersonNode,
} from "@/utils/treeLayout";
import { normalizeForSearch } from "@/utils/textSearch";

const FOUNDER_ROOT_ID = "0911c310-31cd-43c2-a705-67770bd074df";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";
import ExportButton from "./ExportButton";

type DepthPreset = "all" | 1 | 2 | 3 | "custom";
type TreeDisplayMode = "canvas" | "outline";

const GLIDE_EASING = "420ms cubic-bezier(0.22, 1, 0.36, 1)";

function VerticalOutlineNode({
  personId,
  graph,
  depth,
  maxDepth,
  expandedIds,
  onToggleExpand,
  onSelectPerson,
  onOpenModal,
  visited,
}: {
  personId: string;
  graph: NormalizedFamilyGraph;
  depth: number;
  maxDepth: number | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onOpenModal: (id: string) => void;
  visited: Set<string>;
}) {
  if (visited.has(personId)) return null;
  const nextVisited = new Set(visited);
  nextVisited.add(personId);

  const person = graph.personsById.get(personId);
  if (!person) return null;

  const spouses = graph.spousesByPersonId.get(personId) ?? [];
  const children = graph.childrenByPersonId.get(personId) ?? [];
  const isExpanded = expandedIds.has(personId) && (maxDepth === null || depth < maxDepth);

  return (
    <div className="select-text">
      <div
        className={`flex items-center gap-2.5 p-3 rounded-xl border bg-white mb-2 transition-colors ${
          depth === 1
            ? "border-[#A91E22]/40 bg-[#FDF2F2]/40"
            : "border-[#E8E2D8] hover:border-[#C99B35]"
        }`}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggleExpand(personId)}
            className="size-9 rounded-lg bg-[#FAF8F3] border border-[#E8E2D8] flex items-center justify-center text-[#A91E22] shrink-0"
            aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
          >
            {isExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        ) : (
          <span className="size-9 rounded-lg bg-[#FAF8F3] border border-[#E8E2D8]/60 flex items-center justify-center text-[#8A8378] shrink-0">
            <User className="size-4" />
          </span>
        )}

        <div className="flex-1 min-w-0" onClick={() => onSelectPerson(person.id)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold text-[#292725]">
              {person.full_name}
            </span>
            <span className="text-xs font-semibold bg-[#FBF6EA] text-[#8C6818] px-2 py-0.5 rounded">
              {person.generation ? `Đời ${person.generation}` : `Tầng ${depth}`}
            </span>
            {children.length > 0 && (
              <span className="text-xs font-medium text-[#5C5750]">
                ({children.length} con)
              </span>
            )}
          </div>

          <div className="text-xs text-[#5C5750] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>
              {person.birth_year ?? "?"}
              {person.is_deceased ? ` – ${person.death_year ?? "đã mất"}` : ""}
            </span>
            {spouses.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[#8C6818]">
                <Heart className="size-3 text-[#A91E22] fill-[#A91E22]" />
                {spouses.map((s) => s.person.full_name).join(", ")}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal(person.id)}
          className="h-9 px-3 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-semibold text-[#292725] shrink-0"
        >
          Hồ sơ
        </button>
      </div>

      {isExpanded && children.length > 0 && (
        <div className="pl-4 sm:pl-6 ml-4 border-l-2 border-[#E8E2D8]">
          {children.map((ch) => (
            <VerticalOutlineNode
              key={ch.person.id}
              personId={ch.person.id}
              graph={graph}
              depth={depth + 1}
              maxDepth={maxDepth}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelectPerson={onSelectPerson}
              onOpenModal={onOpenModal}
              visited={nextVisited}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FamilyTree({
  personsMap,
  relationships,
  roots,
  upperRoot,
  onChangeRoot,
  canEdit,
  totalPersonsInDatabase,
}: {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  upperRoot?: Person | null;
  onChangeRoot?: (rootId: string | null) => void;
  canEdit?: boolean;
  totalPersonsInDatabase?: number;
  onExpandSubtree?: (personId: string) => Promise<void> | void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { showAvatar, setShowAvatar, setMemberModalId } = useDashboard();

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 700 });
  const [displayMode, setDisplayMode] = useState<TreeDisplayMode>("canvas");

  // Pan, Zoom & Camera Glide state
  const [pan, setPan] = useState({ x: 0, y: 24 });
  const [scale, setScale] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraGliding, setIsCameraGliding] = useState(false);
  const glideTimerRef = useRef<number | null>(null);

  // Unified Pointer tracking for 1-finger pan & 2-finger pinch-to-zoom
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panOriginRef = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 });
  const pinchStartRef = useRef<{ dist: number; scale: number; midX: number; midY: number } | null>(
    null,
  );
  const hasDraggedRef = useRef(false);

  // Depth & Filters
  const [depthPreset, setDepthPreset] = useState<DepthPreset>("all");
  const [customDepth, setCustomDepth] = useState<number>(4);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set());
  const [outlineExpandedIds, setOutlineExpandedIds] = useState<Set<string>>(
    () => new Set(roots.map((r) => r.id)),
  );
  const [branchHistory, setBranchHistory] = useState<Array<{ id: string; name: string }>>([]);
  const [hideSpouses, setHideSpouses] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);

  // Panels & Interactive selection
  const [showFilters, setShowFilters] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const triggerCameraGlide = useCallback(() => {
    if (glideTimerRef.current) window.clearTimeout(glideTimerRef.current);
    setIsCameraGliding(true);
    glideTimerRef.current = window.setTimeout(() => {
      setIsCameraGliding(false);
      glideTimerRef.current = null;
    }, 430);
  }, []);

  const cancelCameraGlide = useCallback(() => {
    if (glideTimerRef.current) {
      window.clearTimeout(glideTimerRef.current);
      glideTimerRef.current = null;
    }
    setIsCameraGliding(false);
  }, []);

  useEffect(
    () => () => {
      if (glideTimerRef.current) window.clearTimeout(glideTimerRef.current);
    },
    [],
  );

  // 1. Normalize raw persons & relationships into deterministic Family Graph
  const allPersonsList = useMemo(() => Array.from(personsMap.values()), [personsMap]);

  const normalizedGraph = useMemo(
    () => normalizeFamilyGraph(allPersonsList, relationships),
    [allPersonsList, relationships],
  );

  const rootIds = useMemo(() => roots.map((r) => r.id), [roots]);
  const rootKey = useMemo(() => rootIds.join("|"), [rootIds]);

  const effectiveMaxDepth = useMemo<number | null>(() => {
    if (depthPreset === "all") return 3;
    if (depthPreset === "custom") return Math.max(1, customDepth || 1);
    return depthPreset;
  }, [depthPreset, customDepth]);

  // Thống kê tổng quan 13 thế hệ & các Chi/Phái thực tế từ 4.031 thành viên (cho chế độ Tổng quan)
  const macroOverview = useMemo(() => {
    const byGen = new Map<number, Person[]>();
    let unknownGenCount = 0;
    for (const p of allPersonsList) {
      if (p.generation && p.generation > 0) {
        if (!byGen.has(p.generation)) byGen.set(p.generation, []);
        byGen.get(p.generation)!.push(p);
      } else {
        unknownGenCount++;
      }
    }
    const generations = Array.from(byGen.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([gen, members]) => ({ gen, count: members.length, members }));

    // Đếm hậu duệ từng nhánh con trực tiếp của Thủy Tổ (hoặc root hiện tại)
    const countSubtree = (rootId: string): { total: number; maxDepth: number } => {
      const visited = new Set<string>([rootId]);
      const q: Array<{ id: string; d: number }> = [{ id: rootId, d: 1 }];
      let maxD = 1;
      let head = 0;
      while (head < q.length) {
        const { id, d } = q[head++];
        if (d > maxD) maxD = d;
        for (const sp of normalizedGraph.spousesByPersonId.get(id) ?? []) {
          visited.add(sp.person.id);
        }
        for (const ch of normalizedGraph.childrenByPersonId.get(id) ?? []) {
          if (!visited.has(ch.person.id)) {
            visited.add(ch.person.id);
            q.push({ id: ch.person.id, d: d + 1 });
          }
        }
      }
      return { total: visited.size, maxDepth: maxD };
    };

    const currentRootId = roots[0]?.id ?? FOUNDER_ROOT_ID;
    const directChildren = normalizedGraph.childrenByPersonId.get(currentRootId) ?? [];
    const branches = directChildren.map((ch) => {
      const stats = countSubtree(ch.person.id);
      const spouses = normalizedGraph.spousesByPersonId.get(ch.person.id) ?? [];
      return {
        person: ch.person,
        spouses: spouses.map((s) => s.person),
        totalMembers: stats.total,
        maxDepth: stats.maxDepth,
      };
    });

    return { generations, unknownGenCount, branches };
  }, [allPersonsList, normalizedGraph, roots]);

  const [selectedOverviewGen, setSelectedOverviewGen] = useState<number | null>(null);

  // 2. Extract visible subgraph
  const subgraph = useMemo(
    () =>
      extractVisibleSubgraph(
        normalizedGraph,
        {
          rootIds,
          maxDepth: effectiveMaxDepth,
          hideSpouses,
          hideMales,
          hideFemales,
          collapsedNodeIds,
        },
        totalPersonsInDatabase ?? allPersonsList.length,
      ),
    [
      normalizedGraph,
      rootIds,
      effectiveMaxDepth,
      hideSpouses,
      hideMales,
      hideFemales,
      collapsedNodeIds,
      totalPersonsInDatabase,
      allPersonsList.length,
    ],
  );

  // 3. Compute deterministic compact layout
  const layoutConfig = useMemo(
    () => ({
      ...DEFAULT_LAYOUT_CONFIG,
      cardWidth: showAvatar ? 168 : 148,
      cardHeight: showAvatar ? 98 : 74,
    }),
    [showAvatar],
  );

  const layout = useMemo(
    () => computeCompactTreeLayout(subgraph, layoutConfig),
    [subgraph, layoutConfig],
  );

  // 4. Highlighted lineage set (Ancestors up + Spouses + Direct Children F1)
  const highlightedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedPersonId) return ids;
    ids.add(selectedPersonId);

    const upQueue = [selectedPersonId];
    const upVisited = new Set<string>([selectedPersonId]);
    while (upQueue.length > 0) {
      const curr = upQueue.shift()!;
      const parents = normalizedGraph.parentsByPersonId.get(curr) ?? [];
      for (const p of parents) {
        ids.add(p.id);
        if (!upVisited.has(p.id)) {
          upVisited.add(p.id);
          upQueue.push(p.id);
        }
      }
    }

    for (const sp of normalizedGraph.spousesByPersonId.get(selectedPersonId) ?? []) {
      ids.add(sp.person.id);
    }
    for (const ch of normalizedGraph.childrenByPersonId.get(selectedPersonId) ?? []) {
      ids.add(ch.person.id);
    }
    return ids;
  }, [selectedPersonId, normalizedGraph]);

  // 5. Measure viewport container & setup outside-click handlers
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setPortalNode(document.getElementById("tree-toolbar-portal"));
    });

    const updateSize = () => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (viewportRef.current) ro.observe(viewportRef.current);

    const onDocMouseDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, []);

  const centerOnPerson = useCallback(
    (personId: string, targetScale?: number) => {
      const node = layout.nodesByPersonId.get(personId);
      if (!node || !viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const s = targetScale ?? scale;
      const nodeCenterX = node.x + node.width / 2;
      const nodeTopY = node.y;
      triggerCameraGlide();
      setPan({
        x: rect.width / 2 - nodeCenterX * s,
        y: Math.max(24, rect.height * 0.24 - nodeTopY * s),
      });
      if (targetScale !== undefined) setScale(targetScale);
    },
    [layout.nodesByPersonId, scale, triggerCameraGlide],
  );

  const fitToView = useCallback(() => {
    if (!viewportRef.current || layout.worldWidth <= 0 || layout.worldHeight <= 0) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const pad = 40;
    const scaleX = (rect.width - pad) / layout.worldWidth;
    const scaleY = (rect.height - pad) / layout.worldHeight;
    const nextScale = Math.max(0.2, Math.min(1.05, Math.min(scaleX, scaleY)));
    triggerCameraGlide();
    setScale(nextScale);
    setPan({
      x: (rect.width - layout.worldWidth * nextScale) / 2,
      y: Math.max(20, (rect.height - layout.worldHeight * nextScale) / 2),
    });
  }, [layout.worldWidth, layout.worldHeight, triggerCameraGlide]);

  const zoomBy = useCallback(
    (delta: number) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const nextScale = Math.max(0.15, Math.min(2.0, scale + delta));
      const worldX = (centerX - pan.x) / scale;
      const worldY = (centerY - pan.y) / scale;
      triggerCameraGlide();
      setScale(nextScale);
      setPan({
        x: centerX - worldX * nextScale,
        y: centerY - worldY * nextScale,
      });
    },
    [pan.x, pan.y, scale, triggerCameraGlide],
  );

  const initialCenteredRef = useRef<string>("");
  useEffect(() => {
    if (!rootKey || layout.nodes.length === 0) return;
    const fitKey = `${rootKey}:${String(depthPreset)}:${String(effectiveMaxDepth)}`;
    if (initialCenteredRef.current === fitKey) return;

    const rafId = requestAnimationFrame(() => {
      if (!viewportRef.current || layout.worldWidth <= 0 || layout.worldHeight <= 0) return;
      const rect = viewportRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const isFirstMount = initialCenteredRef.current === "";
      initialCenteredRef.current = fitKey;

      const pad = 48;
      const scaleX = (rect.width - pad) / layout.worldWidth;
      const scaleY = (rect.height - pad) / layout.worldHeight;
      const nextScale = Math.max(0.22, Math.min(1.0, Math.min(scaleX, scaleY)));

      if (!isFirstMount) triggerCameraGlide();
      setScale(nextScale);
      setPan({
        x: (rect.width - layout.worldWidth * nextScale) / 2,
        y: Math.max(24, (rect.height - layout.worldHeight * nextScale) / 2),
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    rootKey,
    depthPreset,
    effectiveMaxDepth,
    layout.nodes.length,
    layout.worldWidth,
    layout.worldHeight,
    triggerCameraGlide,
  ]);

  // 6. Viewport Culling + Separate 2-pass edges (Normal vs Animated n8n Lineage Flow)
  const visibleElements = useMemo(() => {
    const buffer = 360;
    const viewMinX = (-pan.x - buffer) / scale;
    const viewMaxX = (viewportSize.width - pan.x + buffer) / scale;
    const viewMinY = (-pan.y - buffer) / scale;
    const viewMaxY = (viewportSize.height - pan.y + buffer) / scale;

    const strictMinX = -pan.x / scale;
    const strictMaxX = (viewportSize.width - pan.x) / scale;
    const strictMinY = -pan.y / scale;
    const strictMaxY = (viewportSize.height - pan.y) / scale;

    const nodes: PositionedPersonNode[] = [];
    let inViewportCount = 0;

    for (const n of layout.nodes) {
      if (
        n.x + n.width >= viewMinX &&
        n.x <= viewMaxX &&
        n.y + n.height >= viewMinY &&
        n.y <= viewMaxY
      ) {
        nodes.push(n);
        if (
          n.x + n.width >= strictMinX &&
          n.x <= strictMaxX &&
          n.y + n.height >= strictMinY &&
          n.y <= strictMaxY
        ) {
          inViewportCount++;
        }
      }
    }

    const normalEdges: LayoutEdge[] = [];
    const highlightedEdges: LayoutEdge[] = [];
    for (const e of layout.edges) {
      if (
        e.maxX >= viewMinX &&
        e.minX <= viewMaxX &&
        e.maxY >= viewMinY &&
        e.minY <= viewMaxY
      ) {
        if (
          selectedPersonId !== null &&
          highlightedIds.has(e.fromId) &&
          highlightedIds.has(e.toId)
        ) {
          highlightedEdges.push(e);
        } else {
          normalEdges.push(e);
        }
      }
    }

    return { nodes, normalEdges, highlightedEdges, inViewportCount };
  }, [
    layout.nodes,
    layout.edges,
    pan.x,
    pan.y,
    scale,
    viewportSize.width,
    viewportSize.height,
    selectedPersonId,
    highlightedIds,
  ]);

  // 7. Search on tree (tìm 100% trong 4.031 thành viên)
  const searchResults = useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (q.length < 2) return [];
    const matched: Person[] = [];
    for (const p of allPersonsList) {
      if (normalizeForSearch(p.full_name).includes(q)) {
        matched.push(p);
        if (matched.length >= 12) break;
      }
    }
    return matched;
  }, [searchQuery, allPersonsList]);

  const handleSelectSearchResult = (person: Person) => {
    setSearchQuery(person.full_name);
    setShowSearchDropdown(false);
    setSelectedPersonId(person.id);

    if (displayMode === "canvas" && layout.nodesByPersonId.has(person.id)) {
      centerOnPerson(person.id, Math.max(scale, 0.9));
    } else if (onChangeRoot) {
      const currentRoot = roots[0];
      if (currentRoot && currentRoot.id !== person.id) {
        setBranchHistory((prev) => [
          ...prev,
          { id: currentRoot.id, name: currentRoot.full_name },
        ]);
      }
      onChangeRoot(person.id);
    }
  };

  // 8. Unified Pointer Gesture Handlers (Mouse drag + Touch 1-finger pan + Touch 2-finger pinch-zoom)
  const handleWheel = (e: React.WheelEvent) => {
    if (!viewportRef.current) return;
    e.preventDefault();
    cancelCameraGlide();
    const rect = viewportRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.max(0.15, Math.min(2.0, scale * factor));
    const worldX = (cursorX - pan.x) / scale;
    const worldY = (cursorY - pan.y) / scale;
    setScale(nextScale);
    setPan({
      x: cursorX - worldX * nextScale,
      y: cursorY - worldY * nextScale,
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    cancelCameraGlide();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      setIsDragging(true);
      hasDraggedRef.current = false;
      panOriginRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      pinchStartRef.current = null;
    } else if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const rect = viewportRef.current?.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) / 2 - (rect?.left ?? 0);
      const midY = (pts[0].y + pts[1].y) / 2 - (rect?.top ?? 0);
      pinchStartRef.current = { dist, scale, midX, midY };
      hasDraggedRef.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2 && pinchStartRef.current && viewportRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (pinchStartRef.current.dist > 10) {
        const ratio = newDist / pinchStartRef.current.dist;
        const nextScale = Math.max(0.15, Math.min(2.0, pinchStartRef.current.scale * ratio));
        const rect = viewportRef.current.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        const worldX = (pinchStartRef.current.midX - pan.x) / scale;
        const worldY = (pinchStartRef.current.midY - pan.y) / scale;
        setScale(nextScale);
        setPan({
          x: midX - worldX * nextScale,
          y: midY - worldY * nextScale,
        });
      }
      return;
    }

    if (activePointersRef.current.size === 1 && isDragging) {
      const dx = e.clientX - panOriginRef.current.pointerX;
      const dy = e.clientY - panOriginRef.current.pointerY;
      if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        hasDraggedRef.current = true;
      }
      if (hasDraggedRef.current) {
        setPan({
          x: panOriginRef.current.panX + dx,
          y: panOriginRef.current.panY + dy,
        });
      }
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      setIsDragging(false);
    }
  };

  const toggleCollapseNode = (personId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const toggleOutlineExpand = (personId: string) => {
    setOutlineExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedNodeIds(new Set());
    const currentDepth = effectiveMaxDepth ?? 3;
    const nextDepth = Math.max(2, currentDepth - 1);
    setDepthPreset("custom");
    setCustomDepth(nextDepth);
  };

  const expandAll = () => {
    setCollapsedNodeIds(new Set());
    const currentDepth = effectiveMaxDepth ?? 3;
    const nextDepth = Math.min(20, currentDepth + 1);
    setDepthPreset("custom");
    setCustomDepth(nextDepth);
  };

  const goBackToFounder = () => {
    setBranchHistory([]);
    setDepthPreset("all");
    if (onChangeRoot) {
      onChangeRoot(
        personsMap.has(FOUNDER_ROOT_ID) ? FOUNDER_ROOT_ID : null,
      );
    }
  };

  const selectedPerson = selectedPersonId
    ? normalizedGraph.personsById.get(selectedPersonId) ?? null
    : null;
  const isCompactLod = scale < 0.48;
  const isAtFounder = roots[0]?.id === FOUNDER_ROOT_ID;

  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#FAF8F3] h-full">
        <Users className="size-10 text-[#8A8378] mb-3" />
        <p className="text-base font-semibold text-[#292725]">
          Chưa có dữ liệu cây gia phả để hiển thị
        </p>
        <p className="text-sm text-[#5C5750] mt-1">
          Vui lòng chọn thành viên gốc hoặc kiểm tra kết nối dữ liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex relative bg-[#FAF8F3] overflow-hidden select-none">
      {/* Toolbar Portaled to DashboardViews Header */}
      {portalNode &&
        createPortal(
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-full" ref={filtersRef}>
            {/* Display Mode Switcher: Sơ đồ 2D vs Gia phả dọc (dễ đọc trên Mobile) */}
            <div className="flex items-center bg-white border border-[#E8E2D8] rounded-lg overflow-hidden h-9 text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setDisplayMode("canvas")}
                className={`px-2.5 h-full flex items-center gap-1.5 transition-colors border-r border-[#E8E2D8] ${
                  displayMode === "canvas"
                    ? "bg-[#292725] text-white font-semibold"
                    : "text-[#292725] hover:bg-[#F3EFE6]"
                }`}
              >
                <Network className="size-3.5" />
                <span>Sơ đồ</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("outline")}
                className={`px-2.5 h-full flex items-center gap-1.5 transition-colors ${
                  displayMode === "outline"
                    ? "bg-[#292725] text-white font-semibold"
                    : "text-[#292725] hover:bg-[#F3EFE6]"
                }`}
              >
                <ListTree className="size-3.5" />
                <span>Gia phả dọc</span>
              </button>
            </div>

            {/* Depth Selector (scrollable horizontally on narrow 390px mobile) */}
            <div className="flex items-center bg-white border border-[#E8E2D8] rounded-lg overflow-x-auto max-w-full h-9 text-xs font-medium">
              {(
                [
                  { id: "all", label: `Tổng quan (${subgraph.metrics.totalPersonsInDatabase})` },
                  { id: 1, label: "1 đời" },
                  { id: 2, label: "2 đời" },
                  { id: 3, label: "3 đời" },
                ] as Array<{ id: DepthPreset; label: string }>
              ).map((item) => {
                const active = depthPreset === item.id;
                return (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => setDepthPreset(item.id)}
                    className={`px-2.5 h-full whitespace-nowrap transition-colors border-r last:border-r-0 border-[#E8E2D8] ${
                      active
                        ? "bg-[#A91E22] text-white font-semibold"
                        : "text-[#292725] hover:bg-[#F3EFE6]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDepthPreset("custom")}
                className={`px-2.5 h-full whitespace-nowrap transition-colors ${
                  depthPreset === "custom"
                    ? "bg-[#A91E22] text-white font-semibold"
                    : "text-[#292725] hover:bg-[#F3EFE6]"
                }`}
              >
                Tùy chỉnh
              </button>
              {depthPreset === "custom" && (
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={customDepth}
                  onChange={(e) => setCustomDepth(Math.max(1, Number(e.target.value) || 1))}
                  className="w-11 h-full px-1 text-center border-l border-[#E8E2D8] bg-[#FAF8F3] text-[#292725] focus:outline-none"
                  aria-label="Số đời hiển thị"
                />
              )}
            </div>

            {/* Search on Tree */}
            <div className="relative flex-1 sm:flex-none min-w-[140px]" ref={searchRef}>
              <div className="flex items-center h-9 bg-white border border-[#E8E2D8] rounded-lg px-2.5 gap-1.5 focus-within:border-[#A91E22]">
                <Search className="size-3.5 text-[#8A8378] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  placeholder="Tìm trong 4.031 người..."
                  className="w-full sm:w-44 text-xs text-[#292725] placeholder:text-[#8A8378] bg-transparent focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-[#8A8378] hover:text-[#292725]"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-72 max-w-[90vw] bg-white border border-[#E8E2D8] rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#FAF8F3] border-b last:border-b-0 border-[#E8E2D8] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-semibold text-[#292725] truncate">
                        {p.full_name}
                      </span>
                      <span className="text-[11px] text-[#5C5750] shrink-0">
                        {p.generation ? `Đời ${p.generation}` : ""}
                        {p.birth_year ? ` · ${p.birth_year}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Expand/Collapse (Canvas Mode) */}
            {displayMode === "canvas" && (
              <div className="flex items-center bg-white border border-[#E8E2D8] rounded-lg overflow-hidden h-9 shrink-0">
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 h-full flex items-center gap-1 hover:bg-[#F3EFE6] text-[#292725] text-xs font-medium"
                  title="Thu gọn bớt 1 đời"
                >
                  <ChevronsDownUp className="size-3.5" />
                  <span className="hidden lg:inline">Thu gọn</span>
                </button>
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2.5 h-full flex items-center gap-1 hover:bg-[#F3EFE6] text-[#292725] text-xs font-medium border-l border-[#E8E2D8]"
                  title="Mở rộng thêm 1 đời"
                >
                  <ChevronsUpDown className="size-3.5" />
                  <span className="hidden lg:inline">Mở rộng</span>
                </button>
              </div>
            )}

            {/* Desktop Zoom/Fit (hidden on mobile since bottom-right controls exist) */}
            {displayMode === "canvas" && (
              <div className="hidden md:flex items-center bg-white border border-[#E8E2D8] rounded-lg overflow-hidden h-9 shrink-0">
                <button
                  type="button"
                  onClick={() => zoomBy(-0.14)}
                  className="px-2 h-full hover:bg-[#F3EFE6] text-[#292725]"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (roots[0]) centerOnPerson(roots[0].id, 0.85);
                  }}
                  className="px-2 h-full hover:bg-[#F3EFE6] text-[#292725] text-xs font-medium min-w-[46px] text-center border-x border-[#E8E2D8]"
                  title="Về gốc 85%"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => zoomBy(0.14)}
                  className="px-2 h-full hover:bg-[#F3EFE6] text-[#292725]"
                  title="Phóng to"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={fitToView}
                  className="px-2.5 h-full hover:bg-[#F3EFE6] text-[#292725] border-l border-[#E8E2D8] flex items-center gap-1 text-xs font-medium"
                  title="Vừa khung nhìn"
                >
                  <Maximize2 className="size-3.5" />
                  <span className="hidden xl:inline">Fit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (roots[0]) centerOnPerson(roots[0].id, 0.85);
                  }}
                  className="px-2 h-full hover:bg-[#F3EFE6] text-[#292725] border-l border-[#E8E2D8]"
                  title="Căn giữa người gốc"
                >
                  <Crosshair className="size-3.5" />
                </button>
              </div>
            )}

            {/* Back to Founder 1-Click */}
            {!isAtFounder && onChangeRoot && (
              <button
                type="button"
                onClick={goBackToFounder}
                className="flex items-center gap-1 px-2.5 h-9 rounded-lg text-xs font-semibold bg-[#FDF2F2] text-[#A91E22] border border-[#A91E22]/30 hover:bg-[#A91E22] hover:text-white transition-colors shrink-0"
                title="Quay về Thủy Tổ"
              >
                <Home className="size-3.5" />
                <span className="hidden sm:inline">Về Thủy Tổ</span>
              </button>
            )}

            {/* Filter Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-9 rounded-lg text-xs font-medium border transition-colors ${
                  showFilters
                    ? "bg-[#FDF2F2] text-[#A91E22] border-[#A91E22]"
                    : "bg-white text-[#292725] border-[#E8E2D8] hover:bg-[#F3EFE6]"
                }`}
              >
                <Filter className="size-3.5" />
                <span className="hidden sm:inline">Lọc</span>
              </button>

              {showFilters && (
                <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-[#E8E2D8] rounded-xl shadow-lg p-3.5 flex flex-col gap-2.5 z-50">
                  <div className="text-[11px] font-bold text-[#8A8378] uppercase tracking-wider">
                    Hiển thị
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#292725] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!showAvatar}
                      onChange={(e) => setShowAvatar(!e.target.checked)}
                      className="rounded accent-[#A91E22] size-3.5"
                    />
                    <ImageIcon className="size-3.5 text-[#8A8378]" />
                    Ẩn ảnh đại diện
                  </label>
                  <div className="h-px bg-[#E8E2D8]" />
                  <div className="text-[11px] font-bold text-[#8A8378] uppercase tracking-wider">
                    Lọc thành viên
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#292725] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideSpouses}
                      onChange={(e) => setHideSpouses(e.target.checked)}
                      className="rounded accent-[#A91E22] size-3.5"
                    />
                    Ẩn dâu/rể
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#292725] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideMales}
                      onChange={(e) => setHideMales(e.target.checked)}
                      className="rounded accent-[#A91E22] size-3.5"
                    />
                    Ẩn nam
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#292725] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideFemales}
                      onChange={(e) => setHideFemales(e.target.checked)}
                      className="rounded accent-[#A91E22] size-3.5"
                    />
                    Ẩn nữ
                  </label>
                </div>
              )}
            </div>

            {/* Diagnostics Toggle */}
            <button
              type="button"
              onClick={() => setShowDiagnostics((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                showDiagnostics
                  ? "bg-[#FBF6EA] text-[#8C6818] border-[#C99B35]"
                  : "bg-white text-[#5C5750] border-[#E8E2D8] hover:bg-[#F3EFE6]"
              }`}
              title="Kiểm chứng dữ liệu & Hiệu năng cây"
            >
              <Activity className="size-3.5" />
              <span className="hidden lg:inline">
                Subgraph {subgraph.metrics.subgraphUniquePersons} /{" "}
                {subgraph.metrics.totalPersonsInDatabase.toLocaleString("vi-VN")}
              </span>
            </button>

            {canEdit && <ExportButton />}
          </div>,
          portalNode,
        )}

      {/* MODE C: Tổng quan toàn bộ 4.031 thành viên theo Chi/Phái & 13 Thế hệ */}
      {displayMode === "canvas" && depthPreset === "all" ? (
        <div className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 bg-[#FAF8F3]">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header tổng quan */}
            <div className="bg-white border border-[#E8E2D8] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A91E22] bg-[#FDF2F2] px-2.5 py-1 rounded-md mb-1.5">
                  <Layers className="size-3.5" />
                  <span>Tổng quan toàn bộ dòng họ · {macroOverview.generations.length} thế hệ</span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292725]">
                  {roots[0]?.full_name} — {allPersonsList.length.toLocaleString("vi-VN")} thành viên
                </h2>
                <p className="text-xs sm:text-sm text-[#5C5750] mt-1">
                  Chọn một Chi/Phái hoặc một Thế hệ bên dưới để đi thẳng vào sơ đồ cây chi tiết, tránh kéo dài đường ngang hàng trăm nghìn pixel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDepthPreset(3)}
                className="h-10 px-4 rounded-xl bg-[#A91E22] hover:bg-[#8C171B] text-white text-xs sm:text-sm font-semibold shrink-0 flex items-center justify-center gap-2"
              >
                <Network className="size-4" />
                <span>Mở sơ đồ 3 đời</span>
              </button>
            </div>

            {/* Các Chi / Phái trực tiếp từ gốc */}
            <div>
              <h3 className="text-xs font-bold text-[#8A8378] uppercase tracking-wider mb-3">
                Các nhánh trực hệ từ {roots[0]?.full_name} ({macroOverview.branches.length} nhánh)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {macroOverview.branches.map((b) => (
                  <div
                    key={b.person.id}
                    className="bg-white border border-[#E8E2D8] hover:border-[#A91E22] rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif text-base font-bold text-[#292725]">
                          {b.person.full_name}
                        </h4>
                        <span className="text-xs font-semibold bg-[#FBF6EA] text-[#8C6818] px-2 py-0.5 rounded shrink-0">
                          {b.person.generation ? `Đời ${b.person.generation}` : "Nhánh"}
                        </span>
                      </div>
                      {b.spouses.length > 0 && (
                        <p className="text-xs text-[#5C5750] mt-1 flex items-center gap-1">
                          <Heart className="size-3 text-[#A91E22] fill-[#A91E22]" />
                          <span>{b.spouses.map((s) => s.full_name).join(", ")}</span>
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-xs text-[#5C5750]">
                        <span>
                          Quy mô: <strong className="text-[#292725]">{b.totalMembers.toLocaleString("vi-VN")}</strong> người
                        </span>
                        <span>·</span>
                        <span>
                          Độ sâu: <strong className="text-[#292725]">{b.maxDepth}</strong> đời
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[#E8E2D8]">
                      <button
                        type="button"
                        onClick={() => {
                          setDepthPreset(3);
                          if (onChangeRoot) {
                            setBranchHistory((prev) => [
                              ...prev,
                              { id: roots[0].id, name: roots[0].full_name },
                            ]);
                            onChangeRoot(b.person.id);
                          }
                        }}
                        className="flex-1 h-9 rounded-lg bg-[#FDF2F2] hover:bg-[#A91E22] text-[#A91E22] hover:text-white text-xs font-semibold transition-colors"
                      >
                        Xem cây nhánh này
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberModalId(b.person.id)}
                        className="h-9 px-3 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-semibold text-[#292725]"
                      >
                        Hồ sơ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bản đồ 13 Thế hệ */}
            <div>
              <h3 className="text-xs font-bold text-[#8A8378] uppercase tracking-wider mb-3">
                Phân bổ theo {macroOverview.generations.length} thế hệ (Bấm vào từng đời để xem thành viên)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
                {macroOverview.generations.map((g) => {
                  const active = selectedOverviewGen === g.gen;
                  return (
                    <button
                      key={g.gen}
                      type="button"
                      onClick={() => setSelectedOverviewGen(active ? null : g.gen)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        active
                          ? "bg-[#A91E22] text-white border-[#A91E22]"
                          : "bg-white border-[#E8E2D8] hover:border-[#C99B35] text-[#292725]"
                      }`}
                    >
                      <div className={`text-xs font-semibold ${active ? "text-white/80" : "text-[#8C6818]"}`}>
                        Đời {g.gen}
                      </div>
                      <div className="text-lg font-bold mt-0.5">
                        {g.count.toLocaleString("vi-VN")}
                      </div>
                      <div className={`text-[11px] ${active ? "text-white/80" : "text-[#5C5750]"}`}>
                        thành viên
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedOverviewGen !== null && (
                <div className="mt-4 bg-white border border-[#E8E2D8] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E2D8]">
                    <h4 className="font-bold text-sm text-[#292725]">
                      Thành viên Đời {selectedOverviewGen} (hiển thị tối đa 60 người đầu)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedOverviewGen(null)}
                      className="text-xs text-[#5C5750] hover:text-[#292725]"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                    {(
                      macroOverview.generations.find((x) => x.gen === selectedOverviewGen)
                        ?.members ?? []
                    )
                      .slice(0, 60)
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setDepthPreset(3);
                            if (onChangeRoot) onChangeRoot(m.id);
                          }}
                          className="text-left px-3 py-2 rounded-lg bg-[#FAF8F3] hover:bg-[#FDF2F2] border border-[#E8E2D8] hover:border-[#A91E22] flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-semibold text-[#292725] truncate">
                            {m.full_name}
                          </span>
                          <span className="text-[11px] text-[#5C5750] shrink-0">
                            {m.birth_year ?? "?"}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : displayMode === "outline" ? (
        <div className="flex-1 h-full overflow-y-auto px-3 sm:px-6 py-4 bg-[#FAF8F3]">
          <div className="max-w-3xl mx-auto">
            <div className="mb-3 flex items-center justify-between gap-2 text-xs text-[#5C5750]">
              <span>
                Chế độ đọc dọc dễ nhìn · Bấm mũi tên để mở rộng con cháu
              </span>
              {!isAtFounder && onChangeRoot && (
                <button
                  type="button"
                  onClick={goBackToFounder}
                  className="font-semibold text-[#A91E22] hover:underline"
                >
                  Về Thủy Tổ
                </button>
              )}
            </div>
            {roots.map((r) => (
              <VerticalOutlineNode
                key={r.id}
                personId={r.id}
                graph={normalizedGraph}
                depth={1}
                maxDepth={effectiveMaxDepth}
                expandedIds={outlineExpandedIds}
                onToggleExpand={toggleOutlineExpand}
                onSelectPerson={(id) => setSelectedPersonId(id)}
                onOpenModal={(id) => setMemberModalId(id)}
                visited={new Set()}
              />
            ))}
          </div>
        </div>
      ) : (
        /* MODE A: n8n-style Animated Infinite Dot-Grid Canvas */
        <div
          ref={viewportRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          style={{
            backgroundImage: "radial-gradient(#D6CEC0 1.2px, transparent 1.2px)",
            backgroundSize: `${Math.max(12, 22 * scale)}px ${Math.max(12, 22 * scale)}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            transition:
              isCameraGliding && !isDragging
                ? `background-position ${GLIDE_EASING}, background-size ${GLIDE_EASING}`
                : "none",
          }}
          className={`flex-1 h-full relative overflow-hidden touch-none bg-[#FAF8F3] ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {/* Breadcrumb quay lại Overview khi đang drill-down nhánh */}
          {branchHistory.length > 0 && onChangeRoot && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white border border-[#E8E2D8] rounded-lg px-3 py-1.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={goBackToFounder}
                className="font-semibold text-[#A91E22] hover:underline"
              >
                Tổng quan ({subgraph.metrics.totalPersonsInDatabase.toLocaleString("vi-VN")})
              </button>
              <span className="text-[#8A8378]">/</span>
              <span className="font-medium text-[#292725] truncate max-w-[160px]">
                {roots[0]?.full_name}
              </span>
            </div>
          )}

          {/* Upper Root Quick Button */}
          {upperRoot && onChangeRoot && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
              <button
                type="button"
                onClick={() => onChangeRoot(upperRoot.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E2D8] bg-white px-3 py-1.5 text-xs font-semibold text-[#A91E22] shadow-sm hover:bg-[#FDF2F2]"
              >
                <ArrowUp className="size-3.5" />
                <span>
                  Lên đời trước: {upperRoot.full_name}
                  {upperRoot.generation ? ` (Đời ${upperRoot.generation})` : ""}
                </span>
              </button>
            </div>
          )}

          {/* World Canvas (Transform Layer with Smooth Camera Glide) */}
          <div
            id="export-container"
            style={{
              width: layout.worldWidth,
              height: layout.worldHeight,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
              transformOrigin: "0 0",
              transition:
                isCameraGliding && !isDragging ? `transform ${GLIDE_EASING}` : "none",
              willChange: isCameraGliding || isDragging ? "transform" : "auto",
            }}
            className="relative"
          >
            {/* 2-Pass SVG Edges (Normal + Animated n8n Lineage Flow) */}
            <svg
              width={layout.worldWidth}
              height={layout.worldHeight}
              className="absolute inset-0 pointer-events-none"
            >
              {visibleElements.normalEdges.map((edge) => {
                const d = edge.points
                  .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
                  .join(" ");
                return (
                  <path
                    key={edge.id}
                    d={d}
                    fill="none"
                    stroke={edge.kind === "marriage" ? "#C99B35" : "#C7BFB3"}
                    strokeWidth={edge.kind === "marriage" ? 2 : 1.5}
                    strokeDasharray={edge.kind === "marriage" ? "4 2" : undefined}
                  />
                );
              })}

              {visibleElements.highlightedEdges.map((edge) => {
                const d = edge.points
                  .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
                  .join(" ");
                return (
                  <g key={`hl-${edge.id}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke="#A91E22"
                      strokeOpacity={0.2}
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke="#A91E22"
                      strokeWidth={2.5}
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="n8n-lineage-flow"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Positioned Person Cards (Viewport-Culled + Node Glide + Semantic LOD) */}
            {visibleElements.nodes.map((node) => {
              const person = normalizedGraph.personsById.get(node.personId);
              if (!person) return null;

              const unit = !node.isSpouse
                ? subgraph.unitsByPrimaryId.get(node.personId)
                : undefined;
              const rawChildCount =
                normalizedGraph.childrenByPersonId.get(node.personId)?.length ?? 0;
              const isCollapsed = collapsedNodeIds.has(node.personId);
              const isSelected = selectedPersonId === node.personId;
              const isHighlighted = highlightedIds.has(node.personId);

              return (
                <div
                  key={node.personId}
                  style={{
                    transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                    width: node.width,
                    height: node.height,
                    transition:
                      "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 180ms ease",
                  }}
                  onClick={(e) => {
                    if (hasDraggedRef.current) return;
                    e.stopPropagation();
                    setSelectedPersonId(person.id);
                    // Tap-to-Focus khi zoom quá xa (< 60%) để đọc rõ card
                    if (scale < 0.6) {
                      centerOnPerson(person.id, 0.85);
                    }
                  }}
                  className={`absolute top-0 left-0 rounded-xl bg-white p-2 flex flex-col justify-between cursor-pointer ${
                    isCompactLod ? "border-2" : "border"
                  } ${
                    isSelected
                      ? "border-[#A91E22] ring-2 ring-[#A91E22]/25 shadow-md z-20"
                      : isHighlighted
                        ? "border-[#C99B35] shadow-sm z-10"
                        : "border-[#E8E2D8] hover:border-[#C99B35] shadow-xs"
                  } ${person.is_deceased ? "bg-[#FAF8F3]" : "bg-white"}`}
                >
                  {/* Marriage Badge */}
                  {!isCompactLod && node.isSpouse && (
                    <span
                      title={person.gender === "male" ? "Chồng" : "Vợ"}
                      className="absolute -left-2.5 top-3 size-5 rounded-full bg-white border border-[#C99B35] flex items-center justify-center shadow-xs"
                    >
                      <Heart className="size-2.5 text-[#A91E22] fill-[#A91E22]" />
                    </span>
                  )}

                  {isCompactLod ? (
                    /* Semantic Zoom LOD: Chữ lớn, rõ nét ở tỷ lệ zoom xa */
                    <div className="h-full w-full flex flex-col items-center justify-center text-center gap-1 px-0.5">
                      <p
                        className={`font-extrabold text-[#292725] leading-[1.12] tracking-tight line-clamp-2 ${
                          node.height >= 90 ? "text-[18px]" : "text-[15px]"
                        }`}
                        title={person.full_name}
                      >
                        {person.full_name}
                      </p>
                      <span
                        className={`font-bold rounded-md px-2 py-0.5 leading-none ${
                          isSelected || isHighlighted
                            ? "bg-[#A91E22] text-white"
                            : "bg-[#FBF6EA] text-[#8C6818] border border-[#E8DEC4]"
                        } ${node.height >= 90 ? "text-[13px]" : "text-[12px]"}`}
                      >
                        {person.generation ? `Đời ${person.generation}` : `Tầng ${node.depth}`}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        {showAvatar && (
                          <div className="size-9 rounded-full overflow-hidden border border-[#E8E2D8] bg-[#F3EFE6] shrink-0 flex items-center justify-center">
                            {person.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={person.avatar_url}
                                alt={person.full_name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <DefaultAvatar gender={person.gender} />
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-bold text-[#292725] leading-snug line-clamp-2"
                            title={person.full_name}
                          >
                            {person.full_name}
                          </p>
                          <p className="text-[11px] text-[#5C5750] truncate mt-0.5">
                            {person.birth_year ? person.birth_year : "?"}
                            {person.is_deceased
                              ? ` – ${person.death_year ?? "đã mất"}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#E8E2D8]/60 text-[10px]">
                        <span className="font-semibold text-[#8C6818] bg-[#FBF6EA] px-1.5 py-0.5 rounded">
                          {person.generation
                            ? `Đời ${person.generation}`
                            : `Tầng ${node.depth}`}
                        </span>
                        <div className="flex items-center gap-1">
                          {person.branch && (
                            <span className="text-[#5C5750] truncate max-w-[68px]">
                              {person.branch}
                            </span>
                          )}
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberModalId(person.id);
                            }}
                            className="p-0.5 rounded hover:bg-[#F3EFE6] text-[#5C5750] hover:text-[#A91E22]"
                            title="Xem hồ sơ chi tiết"
                          >
                            <ExternalLink className="size-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Expand / Drill-down Branch Pill */}
                  {!node.isSpouse && rawChildCount > 0 && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          unit?.hasHiddenChildren &&
                          unit.hiddenDescendantCount > 0 &&
                          onChangeRoot
                        ) {
                          const currentRoot = roots[0];
                          if (currentRoot) {
                            setBranchHistory((prev) => [
                              ...prev,
                              { id: currentRoot.id, name: currentRoot.full_name },
                            ]);
                          }
                          onChangeRoot(person.id);
                        } else {
                          toggleCollapseNode(person.id);
                        }
                      }}
                      className={`absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 px-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-0.5 shadow-xs z-20 whitespace-nowrap ${
                        unit?.hasHiddenChildren && unit.hiddenDescendantCount > 0
                          ? "bg-[#FDF2F2] border-[#A91E22] text-[#A91E22] hover:bg-[#A91E22] hover:text-white"
                          : "bg-white border-[#E8E2D8] hover:border-[#A91E22] text-[#5C5750] hover:text-[#A91E22]"
                      }`}
                      title={
                        unit?.hasHiddenChildren && unit.hiddenDescendantCount > 0
                          ? `Mở nhánh ${person.full_name} (${unit.hiddenDescendantCount} hậu duệ · ${unit.hiddenMaxDepth} đời)`
                          : isCollapsed
                            ? `Mở rộng (${rawChildCount} con)`
                            : "Thu gọn nhánh con"
                      }
                    >
                      {unit?.hasHiddenChildren && unit.hiddenDescendantCount > 0 ? (
                        <>
                          <Plus className="size-3" />
                          <span>
                            {unit.hiddenDescendantCount.toLocaleString("vi-VN")} hậu duệ
                          </span>
                        </>
                      ) : isCollapsed ? (
                        <>
                          <Plus className="size-3" />
                          <span>{rawChildCount}</span>
                        </>
                      ) : (
                        <Minus className="size-3" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom-left Live Status Chip (hidden on < sm to avoid overlapping Zoom controls) */}
          <div className="hidden sm:flex absolute bottom-3 left-14 z-20 items-center gap-2 bg-white border border-[#E8E2D8] rounded-lg px-3 py-1.5 text-xs text-[#5C5750] shadow-xs">
            <Layers className="size-3.5 text-[#A91E22]" />
            <span>
              Tổng DB:{" "}
              <strong className="text-[#292725]">
                {subgraph.metrics.totalPersonsInDatabase.toLocaleString("vi-VN")}
              </strong>
              {" · "}Subgraph:{" "}
              <strong className="text-[#292725]">
                {subgraph.metrics.subgraphUniquePersons}
              </strong>
              {" · "}Mounted:{" "}
              <strong className="text-[#292725]">{visibleElements.nodes.length}</strong>
              {" · "}Khung nhìn:{" "}
              <strong className="text-[#292725]">{visibleElements.inViewportCount}</strong>
            </span>
          </div>

          {/* Bottom-right n8n-style Canvas Controls */}
          <div className="absolute bottom-3 right-3 z-20 flex items-center bg-white border border-[#E8E2D8] rounded-lg shadow-xs overflow-hidden h-9">
            <button
              type="button"
              onClick={() => zoomBy(-0.14)}
              className="px-2.5 h-full hover:bg-[#F3EFE6] text-[#292725]"
              title="Thu nhỏ"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-[#5C5750] border-x border-[#E8E2D8]">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomBy(0.14)}
              className="px-2.5 h-full hover:bg-[#F3EFE6] text-[#292725]"
              title="Phóng to"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              type="button"
              onClick={fitToView}
              className="px-2.5 h-full hover:bg-[#F3EFE6] text-[#292725] border-l border-[#E8E2D8] text-xs font-semibold flex items-center gap-1"
              title="Vừa khung nhìn"
            >
              <Maximize2 className="size-3.5" />
              <span>Fit</span>
            </button>
          </div>

          {/* Diagnostics Drawer */}
          {showDiagnostics && (
            <div className="absolute top-3 left-3 z-30 w-80 max-w-[calc(100vw-24px)] bg-white border border-[#E8E2D8] rounded-xl shadow-lg p-4 text-xs">
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#E8E2D8]">
                <span className="font-bold text-[#292725] flex items-center gap-1.5">
                  <Activity className="size-4 text-[#A91E22]" />
                  Kiểm chứng Đồ thị & Layout
                </span>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(false)}
                  className="text-[#8A8378] hover:text-[#292725]"
                >
                  <X className="size-4" />
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[#5C5750]">
                <dt>Tổng DB:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {subgraph.metrics.totalPersonsInDatabase}
                </dd>
                <dt>Đã tải vào Graph:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {subgraph.metrics.personsInLoadedGraph}
                </dd>
                <dt>Subgraph đang mở:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {subgraph.metrics.subgraphUniquePersons}
                </dd>
                <dt>Card đã mount / Khung nhìn:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {visibleElements.nodes.length} / {visibleElements.inViewportCount}
                </dd>
                <dt>Family Units:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {subgraph.metrics.visibleFamilyUnits}
                </dd>
                <dt>Quan hệ Cha-Con:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {subgraph.metrics.visibleParentChildRelations}
                </dd>
                <dt>Ẩn theo độ sâu:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {subgraph.metrics.hiddenByDepth}
                </dd>
                <dt>Quan hệ lỗi/dangling:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {subgraph.metrics.unresolvedRelations}
                </dd>
                <dt>Node Overlaps:</dt>
                <dd
                  className={`text-right font-bold ${
                    layout.overlapCount === 0 ? "text-[#227C44]" : "text-[#A91E22]"
                  }`}
                >
                  {layout.overlapCount}
                </dd>
                <dt>Thời gian Layout:</dt>
                <dd className="text-right font-semibold text-[#292725]">
                  {layout.layoutDurationMs} ms
                </dd>
              </dl>
            </div>
          )}
        </div>
      )}

      {/* Responsive Context Panel: Bottom Sheet on Mobile (< md), Right Drawer on Desktop */}
      {selectedPerson && (
        <>
          <div
            onClick={() => setSelectedPersonId(null)}
            className="fixed inset-0 bg-[#292725]/40 z-40 md:hidden"
            aria-hidden="true"
          />
          <aside className="fixed inset-x-0 bottom-0 max-h-[72dvh] rounded-t-2xl border-t md:static md:w-80 md:max-h-none md:rounded-none md:border-t-0 md:border-l border-[#E8E2D8] bg-white h-auto md:h-full overflow-y-auto p-4 flex flex-col gap-4 z-50 md:z-20 shrink-0 shadow-xl md:shadow-none">
            <div className="w-10 h-1 bg-[#D6CEC0] rounded-full mx-auto md:hidden shrink-0" />
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E8E2D8]">
              <div className="min-w-0">
                <h3 className="font-serif text-base font-bold text-[#292725] truncate">
                  {selectedPerson.full_name}
                </h3>
                <p className="text-xs text-[#5C5750] mt-0.5">
                  {selectedPerson.generation
                    ? `Đời thứ ${selectedPerson.generation}`
                    : "Chưa rõ đời"}
                  {selectedPerson.branch ? ` · ${selectedPerson.branch}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPersonId(null)}
                className="p-2 rounded-lg hover:bg-[#F3EFE6] text-[#8A8378]"
                aria-label="Đóng thông tin"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Primary Actions at top for elderly & mobile */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMemberModalId(selectedPerson.id)}
                className="flex-1 h-10 rounded-lg bg-[#A91E22] hover:bg-[#8C171B] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                Mở hồ sơ
              </button>
              {onChangeRoot && (
                <button
                  type="button"
                  onClick={() => {
                    const currentRoot = roots[0];
                    if (currentRoot && currentRoot.id !== selectedPerson.id) {
                      setBranchHistory((prev) => [
                        ...prev,
                        { id: currentRoot.id, name: currentRoot.full_name },
                      ]);
                    }
                    onChangeRoot(selectedPerson.id);
                  }}
                  className="flex-1 h-10 rounded-lg bg-white hover:bg-[#F3EFE6] border border-[#E8E2D8] text-[#292725] text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Xem nhánh này
                </button>
              )}
            </div>

            <div className="text-xs text-[#5C5750] space-y-1.5 bg-[#FAF8F3] p-3 rounded-lg border border-[#E8E2D8]">
              <div className="flex justify-between">
                <span>Năm sinh:</span>
                <span className="font-medium text-[#292725]">
                  {selectedPerson.birth_year ?? "Chưa cập nhật"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className="font-medium text-[#292725]">
                  {selectedPerson.is_deceased
                    ? `Đã mất (${selectedPerson.death_year ?? "không rõ năm"})`
                    : "Còn sống"}
                </span>
              </div>
            </div>

            {/* Parents */}
            <div>
              <h4 className="text-[11px] font-bold text-[#8A8378] uppercase tracking-wider mb-1.5">
                Cha / Mẹ
              </h4>
              {(normalizedGraph.parentsByPersonId.get(selectedPerson.id) ?? []).length === 0 ? (
                <p className="text-xs text-[#8A8378]">Chưa ghi nhận</p>
              ) : (
                <div className="space-y-1">
                  {(normalizedGraph.parentsByPersonId.get(selectedPerson.id) ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(p.id);
                        if (layout.nodesByPersonId.has(p.id)) centerOnPerson(p.id);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-medium text-[#292725] flex items-center gap-2"
                    >
                      <User className="size-3.5 text-[#A91E22]" />
                      <span className="truncate">{p.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Spouses */}
            <div>
              <h4 className="text-[11px] font-bold text-[#8A8378] uppercase tracking-wider mb-1.5">
                Vợ / Chồng
              </h4>
              {(normalizedGraph.spousesByPersonId.get(selectedPerson.id) ?? []).length === 0 ? (
                <p className="text-xs text-[#8A8378]">Chưa ghi nhận</p>
              ) : (
                <div className="space-y-1">
                  {(normalizedGraph.spousesByPersonId.get(selectedPerson.id) ?? []).map((sp) => (
                    <button
                      key={sp.person.id}
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(sp.person.id);
                        if (layout.nodesByPersonId.has(sp.person.id))
                          centerOnPerson(sp.person.id);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-medium text-[#292725] flex items-center gap-2"
                    >
                      <Heart className="size-3.5 text-[#C99B35]" />
                      <span className="truncate">{sp.person.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Children */}
            <div>
              <h4 className="text-[11px] font-bold text-[#8A8378] uppercase tracking-wider mb-1.5">
                Con cái (
                {(normalizedGraph.childrenByPersonId.get(selectedPerson.id) ?? []).length})
              </h4>
              {(normalizedGraph.childrenByPersonId.get(selectedPerson.id) ?? []).length === 0 ? (
                <p className="text-xs text-[#8A8378]">Chưa ghi nhận</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(normalizedGraph.childrenByPersonId.get(selectedPerson.id) ?? []).map((ch) => (
                    <button
                      key={ch.person.id}
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(ch.person.id);
                        if (layout.nodesByPersonId.has(ch.person.id))
                          centerOnPerson(ch.person.id);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-medium text-[#292725] flex items-center gap-2"
                    >
                      <GitFork className="size-3.5 text-[#5C5750]" />
                      <span className="truncate">{ch.person.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

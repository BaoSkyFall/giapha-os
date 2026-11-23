"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  ExternalLink,
  Filter,
  GitFork,
  Heart,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minus,
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
} from "@/utils/familyGraph";
import {
  computeCompactTreeLayout,
  DEFAULT_LAYOUT_CONFIG,
  type LayoutEdge,
  type PositionedPersonNode,
} from "@/utils/treeLayout";
import { normalizeForSearch } from "@/utils/textSearch";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";
import ExportButton from "./ExportButton";

type DepthPreset = "all" | 1 | 2 | 3 | "custom";

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

  // Pan & Zoom state (world coordinates -> screen transform)
  const [pan, setPan] = useState({ x: 0, y: 24 });
  const [scale, setScale] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const dragOriginRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const hasDraggedRef = useRef(false);

  // Depth & Filters
  // Level A ("all" = Tổng quan toàn bộ 4.031 người theo Chi/Phái, tránh đường ngang 533.000px)
  // Level B (1 | 2 | 3 | "custom" = Cây chi tiết từng nhánh)
  const [depthPreset, setDepthPreset] = useState<DepthPreset>("all");
  const [customDepth, setCustomDepth] = useState<number>(4);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set());
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

  // 1. Normalize raw persons & relationships into deterministic Family Graph
  const allPersonsList = useMemo(
    () => Array.from(personsMap.values()),
    [personsMap],
  );

  const normalizedGraph = useMemo(
    () => normalizeFamilyGraph(allPersonsList, relationships),
    [allPersonsList, relationships],
  );

  const rootIds = useMemo(() => roots.map((r) => r.id), [roots]);
  const rootKey = useMemo(() => rootIds.join("|"), [rootIds]);

  const effectiveMaxDepth = useMemo<number | null>(() => {
    // Ở chế độ Tổng quan ("all"), giữ 3 tầng kết hợp Branch Cluster Badge để không phình 533.000px
    if (depthPreset === "all") return 3;
    if (depthPreset === "custom") return Math.max(1, customDepth || 1);
    return depthPreset;
  }, [depthPreset, customDepth]);

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

  // 4. Highlighted lineage set when a person is selected
  const highlightedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedPersonId) return ids;
    ids.add(selectedPersonId);

    // Ancestors up
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

    // Direct spouses & children
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

  // Center on root when rootKey changes
  const centerOnPerson = useCallback(
    (personId: string, targetScale?: number) => {
      const node = layout.nodesByPersonId.get(personId);
      if (!node || !viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const s = targetScale ?? scale;
      const nodeCenterX = node.x + node.width / 2;
      const nodeTopY = node.y;
      setPan({
        x: rect.width / 2 - nodeCenterX * s,
        y: Math.max(24, rect.height * 0.25 - nodeTopY * s),
      });
      if (targetScale !== undefined) setScale(targetScale);
    },
    [layout.nodesByPersonId, scale],
  );

  const fitToView = useCallback(() => {
    if (!viewportRef.current || layout.worldWidth <= 0 || layout.worldHeight <= 0) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const pad = 40;
    const scaleX = (rect.width - pad) / layout.worldWidth;
    const scaleY = (rect.height - pad) / layout.worldHeight;
    const nextScale = Math.max(0.12, Math.min(1.1, Math.min(scaleX, scaleY)));
    setScale(nextScale);
    setPan({
      x: (rect.width - layout.worldWidth * nextScale) / 2,
      y: Math.max(20, (rect.height - layout.worldHeight * nextScale) / 2),
    });
  }, [layout.worldWidth, layout.worldHeight]);

  const initialCenteredRef = useRef<string>("");
  useEffect(() => {
    if (!rootKey || layout.nodes.length === 0) return;
    const fitKey = `${rootKey}:${String(depthPreset)}:${String(effectiveMaxDepth)}`;
    if (initialCenteredRef.current === fitKey) return;

    const rafId = requestAnimationFrame(() => {
      if (!viewportRef.current || layout.worldWidth <= 0 || layout.worldHeight <= 0) return;
      const rect = viewportRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      initialCenteredRef.current = fitKey;

      if (depthPreset === "all" && layout.worldWidth > rect.width * 8) {
        const firstRoot = roots[0]?.id;
        const node = firstRoot ? layout.nodesByPersonId.get(firstRoot) : null;
        if (node) {
          const defaultScale = 0.85;
          setScale(defaultScale);
          setPan({
            x: rect.width / 2 - (node.x + node.width / 2) * defaultScale,
            y: 36,
          });
          return;
        }
      }

      const pad = 48;
      const scaleX = (rect.width - pad) / layout.worldWidth;
      const scaleY = (rect.height - pad) / layout.worldHeight;
      const nextScale = Math.max(0.25, Math.min(1.0, Math.min(scaleX, scaleY)));
      setScale(nextScale);
      setPan({
        x: (rect.width - layout.worldWidth * nextScale) / 2,
        y: Math.max(24, (rect.height - layout.worldHeight * nextScale) / 2),
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [rootKey, depthPreset, roots, layout.nodes.length, layout.nodesByPersonId, layout.worldWidth, layout.worldHeight]);

  // 6. Viewport Culling (chỉ render DOM node & SVG edge trong khung nhìn + buffer 360px)
  const visibleElements = useMemo(() => {
    const buffer = 360;
    const viewMinX = (-pan.x - buffer) / scale;
    const viewMaxX = (viewportSize.width - pan.x + buffer) / scale;
    const viewMinY = (-pan.y - buffer) / scale;
    const viewMaxY = (viewportSize.height - pan.y + buffer) / scale;

    const nodes: PositionedPersonNode[] = [];
    let inViewportCount = 0;
    const strictMinX = -pan.x / scale;
    const strictMaxX = (viewportSize.width - pan.x) / scale;
    const strictMinY = -pan.y / scale;
    const strictMaxY = (viewportSize.height - pan.y) / scale;

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

    const edges: LayoutEdge[] = [];
    for (const e of layout.edges) {
      if (
        e.maxX >= viewMinX &&
        e.minX <= viewMaxX &&
        e.maxY >= viewMinY &&
        e.minY <= viewMaxY
      ) {
        edges.push(e);
      }
    }

    return { nodes, edges, inViewportCount };
  }, [layout.nodes, layout.edges, pan.x, pan.y, scale, viewportSize.width, viewportSize.height]);

  // 7. Search on tree (tìm trong toàn bộ cây đang tải)
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

    if (layout.nodesByPersonId.has(person.id)) {
      centerOnPerson(person.id, Math.max(scale, 0.9));
    } else {
      // Nếu người được tìm nằm sâu hơn depth hiện tại, tự động mở rộng lên "all" hoặc chuyển root
      setDepthPreset("all");
      if (onChangeRoot) {
        onChangeRoot(person.id);
      }
    }
  };

  // 8. Pan / Zoom mouse & wheel handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (!viewportRef.current) return;
    if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      const rect = viewportRef.current.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const nextScale = Math.max(0.12, Math.min(2.0, scale * factor));
      const worldX = (cursorX - pan.x) / scale;
      const worldY = (cursorY - pan.y) / scale;
      setScale(nextScale);
      setPan({
        x: cursorX - worldX * nextScale,
        y: cursorY - worldY * nextScale,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragOriginRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragOriginRef.current.mouseX;
    const dy = e.clientY - dragOriginRef.current.mouseY;
    if (!hasDraggedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      hasDraggedRef.current = true;
    }
    if (hasDraggedRef.current) {
      setPan({
        x: dragOriginRef.current.panX + dx,
        y: dragOriginRef.current.panY + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleCollapseNode = (personId: string) => {
    setCollapsedNodeIds((prev) => {
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

  const selectedPerson = selectedPersonId
    ? normalizedGraph.personsById.get(selectedPersonId) ?? null
    : null;

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
    <div className="w-full h-full min-h-[560px] flex relative bg-[#FAF8F3] overflow-hidden select-none">
      {/* Toolbar Portaled to DashboardViews Header */}
      {portalNode &&
        createPortal(
          <div className="flex flex-wrap items-center gap-2" ref={filtersRef}>
            {/* Depth Selector: Mặc định Tất cả */}
            <div className="flex items-center bg-white border border-[#E8E2D8] rounded-lg overflow-hidden h-9 text-xs font-medium">
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
                    className={`px-2.5 h-full transition-colors border-r last:border-r-0 border-[#E8E2D8] ${
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
                className={`px-2.5 h-full transition-colors ${
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
                  className="w-12 h-full px-1.5 text-center border-l border-[#E8E2D8] bg-[#FAF8F3] text-[#292725] focus:outline-none"
                  aria-label="Số đời hiển thị"
                />
              )}
            </div>

            {/* Search on Tree */}
            <div className="relative" ref={searchRef}>
              <div className="flex items-center h-9 bg-white border border-[#E8E2D8] rounded-lg px-2.5 gap-1.5 focus-within:border-[#A91E22]">
                <Search className="size-3.5 text-[#8A8378]" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  placeholder="Tìm trên cây..."
                  className="w-32 sm:w-44 text-xs text-[#292725] placeholder:text-[#8A8378] bg-transparent focus:outline-none"
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
                <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-[#E8E2D8] rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(p)}
                      className="w-full text-left px-3 py-2 hover:bg-[#FAF8F3] border-b last:border-b-0 border-[#E8E2D8] flex items-center justify-between gap-2"
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

            {/* Expand/Collapse */}
            <div className="flex items-center bg-white border border-[#E8E2D8] rounded-lg overflow-hidden h-9">
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 h-full flex items-center gap-1 hover:bg-[#F3EFE6] text-[#292725] text-xs font-medium"
                title="Thu gọn nhánh"
              >
                <ChevronsDownUp className="size-3.5" />
                <span className="hidden xl:inline">Thu gọn</span>
              </button>
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 h-full flex items-center gap-1 hover:bg-[#F3EFE6] text-[#292725] text-xs font-medium border-l border-[#E8E2D8]"
                title="Mở rộng toàn bộ"
              >
                <ChevronsUpDown className="size-3.5" />
                <span className="hidden xl:inline">Mở rộng</span>
              </button>
            </div>

            {/* Zoom & Fit Controls */}
            <div className="flex items-center bg-white border border-[#E8E2D8] rounded-lg overflow-hidden h-9">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.12, s - 0.12))}
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
                onClick={() => setScale((s) => Math.min(2.0, s + 0.12))}
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

            {/* Filter Dropdown (Solid Light Mode, không glassmorphism) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border transition-colors ${
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
              className={`flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium border transition-colors ${
                showDiagnostics
                  ? "bg-[#FBF6EA] text-[#8C6818] border-[#C99B35]"
                  : "bg-white text-[#5C5750] border-[#E8E2D8] hover:bg-[#F3EFE6]"
              }`}
              title="Kiểm chứng dữ liệu & Hiệu năng cây"
            >
              <Activity className="size-3.5" />
              <span className="hidden lg:inline">
                Subgraph {subgraph.metrics.subgraphUniquePersons} / {subgraph.metrics.totalPersonsInDatabase.toLocaleString("vi-VN")}
              </span>
            </button>

            {canEdit && <ExportButton />}
          </div>,
          portalNode,
        )}

      {/* Main Pan/Zoom Viewport (n8n-style Infinite Dot-Grid Canvas) */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          backgroundImage: "radial-gradient(#D6CEC0 1.2px, transparent 1.2px)",
          backgroundSize: `${Math.max(12, 22 * scale)}px ${Math.max(12, 22 * scale)}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        className={`flex-1 h-full relative overflow-hidden bg-[#FAF8F3] ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
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

        {/* World Canvas (Transform Layer) */}
        <div
          id="export-container"
          style={{
            width: layout.worldWidth,
            height: layout.worldHeight,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transformOrigin: "0 0",
          }}
          className="relative"
        >
          {/* Orthogonal SVG Edges (Viewport-Culled) */}
          <svg
            width={layout.worldWidth}
            height={layout.worldHeight}
            className="absolute inset-0 pointer-events-none"
          >
            {visibleElements.edges.map((edge) => {
              const isHighlighted =
                selectedPersonId !== null &&
                highlightedIds.has(edge.fromId) &&
                highlightedIds.has(edge.toId);
              const d = edge.points
                .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
                .join(" ");

              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={
                    isHighlighted
                      ? "#A91E22"
                      : edge.kind === "marriage"
                        ? "#C99B35"
                        : "#C7BFB3"
                  }
                  strokeWidth={isHighlighted ? 2.5 : edge.kind === "marriage" ? 2 : 1.5}
                  strokeDasharray={edge.kind === "marriage" ? "4 2" : undefined}
                />
              );
            })}
          </svg>

          {/* Positioned Person Cards (Viewport-Culled) */}
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
                }}
                onClick={(e) => {
                  if (hasDraggedRef.current) return;
                  e.stopPropagation();
                  setSelectedPersonId(person.id);
                }}
                className={`absolute top-0 left-0 rounded-xl border bg-white p-2 flex flex-col justify-between transition-shadow cursor-pointer ${
                  isSelected
                    ? "border-[#A91E22] ring-2 ring-[#A91E22]/25 shadow-md z-20"
                    : isHighlighted
                      ? "border-[#C99B35] shadow-sm z-10"
                      : "border-[#E8E2D8] hover:border-[#C99B35] shadow-xs"
                } ${person.is_deceased ? "bg-[#FAF8F3]" : "bg-white"}`}
              >
                {/* Marriage Badge */}
                {node.isSpouse && (
                  <span
                    title={person.gender === "male" ? "Chồng" : "Vợ"}
                    className="absolute -left-2.5 top-3 size-5 rounded-full bg-white border border-[#C99B35] flex items-center justify-center shadow-xs"
                  >
                    <Heart className="size-2.5 text-[#A91E22] fill-[#A91E22]" />
                  </span>
                )}

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
                    {person.generation ? `Đời ${person.generation}` : `Tầng ${node.depth}`}
                  </span>
                  <div className="flex items-center gap-1">
                    {person.branch && (
                      <span className="text-[#5C5750] truncate max-w-[68px]">
                        {person.branch}
                      </span>
                    )}
                    <button
                      type="button"
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

                {/* Expand / Drill-down Branch Pill */}
                {!node.isSpouse && rawChildCount > 0 && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (unit?.hasHiddenChildren && unit.hiddenDescendantCount > 0 && onChangeRoot) {
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
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 h-5 px-2 rounded-full border text-[10px] font-semibold flex items-center gap-0.5 shadow-xs z-20 whitespace-nowrap ${
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
                        <Plus className="size-2.5" />
                        <span>
                          {unit.hiddenDescendantCount.toLocaleString("vi-VN")} hậu duệ
                        </span>
                      </>
                    ) : isCollapsed ? (
                      <>
                        <Plus className="size-2.5" />
                        <span>{rawChildCount}</span>
                      </>
                    ) : (
                      <Minus className="size-2.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Breadcrumb quay lại Overview khi đang drill-down nhánh */}
        {branchHistory.length > 0 && onChangeRoot && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white border border-[#E8E2D8] rounded-lg px-3 py-1.5 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => {
                const first = branchHistory[0];
                setBranchHistory([]);
                onChangeRoot(first.id);
              }}
              className="font-semibold text-[#A91E22] hover:underline"
            >
              Tổng quan ({subgraph.metrics.totalPersonsInDatabase.toLocaleString("vi-VN")})
            </button>
            <span className="text-[#8A8378]">/</span>
            <span className="font-medium text-[#292725] truncate max-w-[180px]">
              {roots[0]?.full_name}
            </span>
          </div>
        )}

        {/* Bottom-left Live Status Chip (5 chỉ số tách bạch) */}
        <div className="absolute bottom-3 left-14 z-20 flex items-center gap-2 bg-white border border-[#E8E2D8] rounded-lg px-3 py-1.5 text-xs text-[#5C5750] shadow-xs">
          <Layers className="size-3.5 text-[#A91E22]" />
          <span>
            Tổng DB: <strong className="text-[#292725]">{subgraph.metrics.totalPersonsInDatabase.toLocaleString("vi-VN")}</strong>
            {" · "}Subgraph: <strong className="text-[#292725]">{subgraph.metrics.subgraphUniquePersons}</strong>
            {" · "}Mounted: <strong className="text-[#292725]">{visibleElements.nodes.length}</strong>
            {" · "}Khung nhìn: <strong className="text-[#292725]">{visibleElements.inViewportCount}</strong>
          </span>
        </div>

        {/* Bottom-right n8n-style Canvas Controls */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center bg-white border border-[#E8E2D8] rounded-lg shadow-xs overflow-hidden h-8">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.12, s - 0.12))}
            className="px-2 h-full hover:bg-[#F3EFE6] text-[#292725]"
            title="Thu nhỏ"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="px-2 text-[11px] font-semibold text-[#5C5750] border-x border-[#E8E2D8]">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.0, s + 0.12))}
            className="px-2 h-full hover:bg-[#F3EFE6] text-[#292725]"
            title="Phóng to"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={fitToView}
            className="px-2.5 h-full hover:bg-[#F3EFE6] text-[#292725] border-l border-[#E8E2D8] text-[11px] font-semibold flex items-center gap-1"
            title="Vừa khung nhìn"
          >
            <Maximize2 className="size-3" />
            Fit
          </button>
        </div>

        {/* Diagnostics Drawer (Graph Metrics) */}
        {showDiagnostics && (
          <div className="absolute top-3 left-3 z-30 w-80 bg-white border border-[#E8E2D8] rounded-xl shadow-lg p-4 text-xs">
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
              <dt>Ẩn theo bộ lọc:</dt>
              <dd className="text-right font-semibold text-[#292725]">
                {subgraph.metrics.hiddenByFilter}
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

      {/* Context Panel (Right Drawer when a person is clicked) */}
      {selectedPerson && (
        <aside className="w-80 shrink-0 border-l border-[#E8E2D8] bg-white h-full overflow-y-auto p-4 flex flex-col gap-4 z-20">
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
              className="p-1 rounded-lg hover:bg-[#F3EFE6] text-[#8A8378]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="text-xs text-[#5C5750] space-y-1.5">
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-medium text-[#292725] flex items-center gap-2"
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-medium text-[#292725] flex items-center gap-2"
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E8E2D8] text-xs font-medium text-[#292725] flex items-center gap-2"
                  >
                    <GitFork className="size-3.5 text-[#5C5750]" />
                    <span className="truncate">{ch.person.full_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E8E2D8] flex flex-col gap-2 mt-auto">
            <button
              type="button"
              onClick={() => setMemberModalId(selectedPerson.id)}
              className="w-full h-9 rounded-lg bg-[#A91E22] hover:bg-[#8C171B] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              Mở hồ sơ đầy đủ
            </button>
            {onChangeRoot && (
              <button
                type="button"
                onClick={() => onChangeRoot(selectedPerson.id)}
                className="w-full h-9 rounded-lg bg-white hover:bg-[#F3EFE6] border border-[#E8E2D8] text-[#292725] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                Đặt làm người gốc
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

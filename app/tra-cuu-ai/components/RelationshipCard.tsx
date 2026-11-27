"use client";

import { ArrowLeftRight, GitBranch } from "lucide-react";
import type { PersonDetail, RelationshipData } from "@/types/ai-advisor";
import { extractPersonName } from "./PersonCard";

interface RelationshipCardProps {
  relationship: RelationshipData;
  primaryPerson?: PersonDetail;
  secondaryPerson?: PersonDetail;
}

export default function RelationshipCard({
  relationship,
  primaryPerson,
  secondaryPerson,
}: RelationshipCardProps) {
  const nameA = extractPersonName(primaryPerson);
  const nameB = extractPersonName(secondaryPerson);
  const commonAncestorName = relationship.common_ancestor
    ? extractPersonName(relationship.common_ancestor)
    : null;

  return (
    <div className="bg-[#FAF8F3] border border-[#E8E2D8] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#A91E22]">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Quan hệ huyết thống &amp; Xưng hô
        </span>
        {relationship.relationship_type && (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#FBF6EA] text-[#8F6A16] border border-[#C99B35]/30">
            {relationship.relationship_type}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-lg p-3">
          <p className="text-xs text-[#8A8378] mb-1">{nameA} gọi {nameB} là</p>
          <p className="text-sm font-bold text-[#292725]">{relationship.a_calls_b}</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-lg p-3">
          <p className="text-xs text-[#8A8378] mb-1">{nameB} gọi {nameA} là</p>
          <p className="text-sm font-bold text-[#292725]">{relationship.b_calls_a}</p>
        </div>
      </div>

      {commonAncestorName && (
        <div className="flex items-center gap-2 text-xs text-[#5C5750] bg-[#FFFFFF] border border-[#E8E2D8] rounded-lg px-3 py-2">
          <GitBranch className="w-3.5 h-3.5 text-[#A91E22] shrink-0" />
          <span>
            Tổ chung gần nhất: <strong className="text-[#292725]">{commonAncestorName}</strong>
          </span>
        </div>
      )}

      {Array.isArray(relationship.path_labels) && relationship.path_labels.length > 0 && (
        <div className="text-xs text-[#5C5750]">
          <span className="text-[#8A8378] block mb-1">Nhánh kết nối:</span>
          <p className="leading-relaxed text-[#292725] bg-[#FFFFFF] border border-[#E8E2D8] rounded-lg px-3 py-2">
            {relationship.path_labels.join(" → ")}
          </p>
        </div>
      )}
    </div>
  );
}

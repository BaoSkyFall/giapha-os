"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, CheckCircle2, AlertCircle, ListChecks } from "lucide-react";
import type { ProvenanceSource, ReasoningStep } from "@/types/ai-advisor";

interface SourceCitationPanelProps {
  provenance?: ProvenanceSource[];
  sources?: Array<string | ProvenanceSource | Record<string, unknown>>;
  dataCompleteness?: number | string | null;
  missingFields?: string[];
  reasoningSteps?: ReasoningStep[];
}

function formatCompleteness(val: number | string | null | undefined): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) {
    const pct = val <= 1 ? Math.round(val * 100) : Math.round(val);
    return `${pct}%`;
  }
  if (typeof val === "string" && val.trim()) return val.trim();
  return null;
}

export default function SourceCitationPanel({
  provenance,
  sources,
  dataCompleteness,
  missingFields,
  reasoningSteps,
}: SourceCitationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const normalizedProvenance: ProvenanceSource[] = (() => {
    if (Array.isArray(provenance) && provenance.length > 0) return provenance;
    if (!Array.isArray(sources) || sources.length === 0) return [];
    return sources.map((s, idx) => {
      if (typeof s === "string") {
        return {
          source_id: `src-${idx}`,
          source_type: "Tư liệu gia phả",
          title: s,
          verified: true,
        };
      }
      const obj = s as Record<string, unknown>;
      return {
        source_id: typeof obj.source_id === "string" ? obj.source_id : `src-${idx}`,
        source_type: typeof obj.source_type === "string" ? obj.source_type : "Hồ sơ",
        title: typeof obj.title === "string" ? obj.title : "Hồ sơ gia phả",
        record_id: typeof obj.record_id === "string" ? obj.record_id : undefined,
        verified: typeof obj.verified === "boolean" ? obj.verified : true,
      };
    });
  })();

  const completenessText = formatCompleteness(dataCompleteness);
  const hasMissing = Array.isArray(missingFields) && missingFields.length > 0;
  const hasSteps = Array.isArray(reasoningSteps) && reasoningSteps.length > 0;

  if (
    normalizedProvenance.length === 0 &&
    !completenessText &&
    !hasMissing &&
    !hasSteps
  ) {
    return null;
  }

  return (
    <div className="mt-3 border border-[#E8E2D8] rounded-xl bg-[#FAF8F3] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium text-[#5C5750] hover:text-[#292725] hover:bg-[#F3EFE6] transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#A91E22]" />
          <span>
            Nguồn đối chiếu &amp; Tiến trình tra cứu
            {normalizedProvenance.length > 0 ? ` (${normalizedProvenance.length})` : ""}
          </span>
          {completenessText && (
            <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-[#E8E2D8] text-[11px] text-[#5C5750]">
              Độ đầy đủ: {completenessText}
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#8A8378] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#8A8378] shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E8E2D8] space-y-3 text-xs">
          {normalizedProvenance.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-semibold text-[#5C5750]">Hồ sơ nguồn:</p>
              <ul className="space-y-1.5">
                {normalizedProvenance.map((src) => (
                  <li
                    key={src.source_id}
                    className="flex items-start justify-between gap-2 bg-[#FFFFFF] border border-[#E8E2D8] rounded-lg px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#292725] truncate">{src.title}</p>
                      <p className="text-[11px] text-[#8A8378]">
                        {src.source_type}
                        {src.record_id ? ` · Mã: ${src.record_id}` : ""}
                      </p>
                    </div>
                    {src.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#227C44] shrink-0 mt-0.5" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasMissing && (
            <div className="space-y-1.5">
              <p className="font-semibold text-[#8F6A16] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Thông tin còn thiếu trong gia phả:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingFields!.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-0.5 rounded-md bg-[#FBF6EA] text-[#8F6A16] border border-[#C99B35]/30 text-[11px]"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasSteps && (
            <div className="space-y-1.5">
              <p className="font-semibold text-[#5C5750] flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5 text-[#8A8378]" />
                Tiến trình tra cứu:
              </p>
              <ol className="space-y-1 text-[#5C5750]">
                {reasoningSteps!.map((step, idx) => (
                  <li key={`${step.step}-${idx}`} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#E8E2D8] text-[#292725] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-medium text-[#292725]">{step.title}</span>
                      {step.detail ? (
                        <span className="text-[#5C5750]"> — {step.detail}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

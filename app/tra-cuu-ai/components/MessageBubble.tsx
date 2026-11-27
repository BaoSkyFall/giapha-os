"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  ThumbsUp,
  ExternalLink,
  GitFork,
  Flag,
  Sparkles,
  UserCheck,
  RotateCcw,
} from "lucide-react";
import type { ChatMessage, CandidatePerson } from "@/types/ai-advisor";
import ChatMessageRenderer from "@/components/chat/ChatMessageRenderer";
import VerificationBadge from "./VerificationBadge";
import PersonCard, { extractPersonId } from "./PersonCard";
import RelationshipCard from "./RelationshipCard";
import SourceCitationPanel from "./SourceCitationPanel";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onSelectCandidate: (personId: string, name: string) => void;
  onSelectSuggestion: (query: string) => void;
  onReportCorrection: (message: ChatMessage) => void;
  onRegenerate?: () => void;
}

function DisambiguationList({
  candidates,
  onSelect,
}: {
  candidates: CandidatePerson[];
  onSelect: (personId: string, name: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-[#5C5750]">
        Có nhiều thành viên trùng hoặc gần giống tên, vui lòng chọn đúng người:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {candidates.map((c) => (
          <button
            key={c.person_id}
            type="button"
            onClick={() => onSelect(c.person_id, c.display_name)}
            className="text-left bg-[#FAF8F3] hover:bg-[#FDF2F2] border border-[#E8E2D8] hover:border-[#A91E22] rounded-xl p-3 transition-colors flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#292725] truncate">
                {c.honorific ? `${c.honorific} ` : ""}
                {c.display_name}
              </p>
              <p className="text-xs text-[#5C5750] mt-0.5">
                {c.generation ? `Đời ${c.generation}` : "Chưa rõ đời"}
                {c.branch ? ` · ${c.branch}` : ""}
                {c.birth_display || c.birth_year
                  ? ` · Sinh ${c.birth_display ?? c.birth_year}`
                  : ""}
              </p>
            </div>
            <UserCheck className="w-4 h-4 text-[#A91E22] shrink-0 mt-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MessageBubble({
  message,
  isStreaming = false,
  onSelectCandidate,
  onSelectSuggestion,
  onReportCorrection,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [helpful, setHelpful] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] bg-[#A91E22] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-xs">
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-pretty">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const primaryPerson = message.data?.primary_person;
  const secondaryPerson = message.data?.secondary_person;
  const relatedPersons = message.data?.related_persons;
  const relationship = message.data?.relationship;
  const primaryPersonId =
    extractPersonId(primaryPerson) ?? message.subject_id ?? null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="flex justify-start">
      <div className="w-full bg-[#FFFFFF] border border-[#E8E2D8] rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Top bar: Avatar + Verification Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#A91E22] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-[#292725]">
              Trợ lý Gia phả
            </span>
          </div>

          <VerificationBadge
            status={message.verification_status}
            isDemoData={message.is_demo_data}
          />
        </div>

        {/* Main response text (CommonMark / GFM + Sanitized Rich Text) */}
        <ChatMessageRenderer content={message.content} isStreaming={isStreaming} />

        {/* Structured Cards */}
        {primaryPerson && <PersonCard person={primaryPerson} />}
        {secondaryPerson && <PersonCard person={secondaryPerson} />}

        {relationship && (
          <RelationshipCard
            relationship={relationship}
            primaryPerson={primaryPerson}
            secondaryPerson={secondaryPerson}
          />
        )}

        {Array.isArray(relatedPersons) && relatedPersons.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedPersons.slice(0, 6).map((rp, idx) => (
              <PersonCard
                key={extractPersonId(rp) ?? `rel-${idx}`}
                person={rp}
                compact
              />
            ))}
          </div>
        )}

        {Array.isArray(message.candidates) && message.candidates.length > 0 && (
          <DisambiguationList
            candidates={message.candidates}
            onSelect={onSelectCandidate}
          />
        )}

        {/* Source Citation & Completeness Panel */}
        <SourceCitationPanel
          provenance={message.provenance}
          sources={message.sources}
          dataCompleteness={message.data_completeness}
          missingFields={message.missing_fields}
          reasoningSteps={message.reasoning_steps}
        />

        {/* Follow-up actions */}
        <div className="pt-2.5 border-t border-[#E8E2D8] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5C5750] hover:text-[#292725] hover:bg-[#F3EFE6] transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#227C44]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "Đã chép" : "Sao chép"}</span>
          </button>

          <button
            type="button"
            onClick={() => setHelpful((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              helpful
                ? "bg-[#EEF7F1] text-[#227C44]"
                : "text-[#5C5750] hover:text-[#292725] hover:bg-[#F3EFE6]"
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Hữu ích</span>
          </button>

          {onRegenerate && !isStreaming && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5C5750] hover:text-[#292725] hover:bg-[#F3EFE6] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tạo lại</span>
            </button>
          )}

          {primaryPersonId && (
            <>
              <Link
                href={`/dashboard/members?id=${encodeURIComponent(primaryPersonId)}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5C5750] hover:text-[#A91E22] hover:bg-[#FDF2F2] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem hồ sơ</span>
              </Link>
              <Link
                href={`/dashboard/members?focus=${encodeURIComponent(primaryPersonId)}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5C5750] hover:text-[#A91E22] hover:bg-[#FDF2F2] transition-colors"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Xem cây gia phả</span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => onReportCorrection(message)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5C5750] hover:text-[#A91E22] hover:bg-[#FDF2F2] transition-colors ml-auto"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Báo sửa thông tin</span>
          </button>
        </div>

        {/* Suggested follow-up chips */}
        {Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FAF8F3] border border-[#E8E2D8] text-[#5C5750] hover:border-[#A91E22] hover:text-[#A91E22] hover:bg-[#FDF2F2] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

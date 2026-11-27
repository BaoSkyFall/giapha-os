"use client";

import Link from "next/link";
import { User, GitFork, ExternalLink, Calendar, Users } from "lucide-react";
import type { PersonDetail } from "@/types/ai-advisor";

function strVal(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function numVal(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function extractPersonId(person?: PersonDetail): string | null {
  if (!person || typeof person !== "object") return null;
  const p = person as Record<string, unknown>;
  return strVal(p.id) ?? strVal(p.person_id) ?? null;
}

export function extractPersonName(person?: PersonDetail): string {
  if (!person || typeof person !== "object") return "Thành viên";
  const p = person as Record<string, unknown>;
  return strVal(p.full_name) ?? strVal(p.display_name) ?? "Thành viên";
}

interface PersonCardProps {
  person: PersonDetail;
  compact?: boolean;
}

export default function PersonCard({ person, compact = false }: PersonCardProps) {
  const p = person as Record<string, unknown>;
  const id = extractPersonId(person);
  const name = extractPersonName(person);
  const honorific = strVal(p.honorific);
  const generation = numVal(p.generation);
  const branch = strVal(p.branch);
  const birthDisplay =
    strVal(p.birth_display) ?? (numVal(p.birth_year) ? String(p.birth_year) : null);
  const deathDisplay =
    strVal(p.death_display) ?? (numVal(p.death_year) ? String(p.death_year) : null);
  const fatherName = strVal(p.father_name);
  const motherName = strVal(p.mother_name);
  const isDeceased = Boolean(p.is_deceased);

  return (
    <div className="bg-[#FAF8F3] border border-[#E8E2D8] rounded-xl p-4 transition-colors hover:border-[#D6CEC0]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#FDF2F2] border border-[#A91E22]/20 flex items-center justify-center shrink-0 text-[#A91E22]">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-serif font-bold text-[#292725] text-base leading-snug truncate">
              {honorific ? `${honorific} ` : ""}
              {name}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {generation !== null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FBF6EA] text-[#8F6A16] border border-[#C99B35]/30">
                  Đời {generation}
                </span>
              )}
              {branch && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFFFFF] text-[#5C5750] border border-[#E8E2D8]">
                  {branch}
                </span>
              )}
              {isDeceased && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#F3EFE6] text-[#5C5750]">
                  Đã khuất
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {!compact && (birthDisplay || deathDisplay || fatherName || motherName) && (
        <div className="mt-3 pt-3 border-t border-[#E8E2D8] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5C5750]">
          {(birthDisplay || deathDisplay) && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8A8378] shrink-0" />
              <span>
                {birthDisplay ? `Sinh: ${birthDisplay}` : "Sinh: Chưa rõ"}
                {deathDisplay ? ` · Mất: ${deathDisplay}` : ""}
              </span>
            </div>
          )}
          {(fatherName || motherName) && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#8A8378] shrink-0" />
              <span className="truncate">
                {fatherName ? `Cha: ${fatherName}` : ""}
                {fatherName && motherName ? " · " : ""}
                {motherName ? `Mẹ: ${motherName}` : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {id && (
        <div className="mt-3 pt-2.5 border-t border-[#E8E2D8] flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/members?id=${encodeURIComponent(id)}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#FFFFFF] text-[#292725] border border-[#E8E2D8] hover:border-[#A91E22] hover:text-[#A91E22] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Xem hồ sơ
          </Link>
          <Link
            href={`/dashboard/tree?focus=${encodeURIComponent(id)}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#FFFFFF] text-[#292725] border border-[#E8E2D8] hover:border-[#A91E22] hover:text-[#A91E22] transition-colors"
          >
            <GitFork className="w-3.5 h-3.5" />
            Xem cây gia phả
          </Link>
        </div>
      )}
    </div>
  );
}

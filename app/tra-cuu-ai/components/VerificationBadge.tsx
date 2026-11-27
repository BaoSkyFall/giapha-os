"use client";

import { ShieldCheck, AlertTriangle, Database, HelpCircle } from "lucide-react";
import type { VerificationStatus } from "@/types/ai-advisor";

interface VerificationBadgeProps {
  status?: VerificationStatus;
  isDemoData?: boolean;
}

export default function VerificationBadge({
  status,
  isDemoData,
}: VerificationBadgeProps) {
  if (isDemoData || status === "demo") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F3EFE6] text-[#5C5750] border border-[#D6CEC0]">
        <Database className="w-3.5 h-3.5 text-[#8A8378]" />
        Dữ liệu mẫu
      </span>
    );
  }

  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF7F1] text-[#227C44] border border-[#227C44]/25">
        <ShieldCheck className="w-3.5 h-3.5 text-[#227C44]" />
        Đã đối chiếu gia phả
      </span>
    );
  }

  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FBF6EA] text-[#8F6A16] border border-[#C99B35]/35">
        <AlertTriangle className="w-3.5 h-3.5 text-[#C99B35]" />
        Dữ liệu chưa đầy đủ
      </span>
    );
  }

  if (status === "not_found") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F3EFE6] text-[#5C5750] border border-[#D6CEC0]">
        <HelpCircle className="w-3.5 h-3.5 text-[#8A8378]" />
        Chưa có dữ liệu
      </span>
    );
  }

  return null;
}

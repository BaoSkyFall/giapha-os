"use client";

import { createClient } from "@/utils/supabase/client";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SyncFamilyButtonProps {
  personId: string;
  personGeneration: number | null;
  personBranch: string | null;
  className?: string;
}

export default function SyncFamilyButton({
  personId,
  personGeneration,
  personBranch,
  className = "",
}: SyncFamilyButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSync = async () => {
    if (
      !confirm(
        `Đồng bộ nhánh "${personBranch || "(trống)"}" và đời thứ ${personGeneration ?? "?"} cho tất cả vợ/chồng và con cái?`,
      )
    ) {
      return;
    }

    setSyncing(true);
    setResult(null);

    try {
      let updatedCount = 0;

      // 1. Find all spouses (marriages where this person is person_a or person_b)
      const { data: marriagesA } = await supabase
        .from("relationships")
        .select("person_b")
        .eq("person_a", personId)
        .eq("type", "marriage");

      const { data: marriagesB } = await supabase
        .from("relationships")
        .select("person_a")
        .eq("person_b", personId)
        .eq("type", "marriage");

      const spouseIds = [
        ...(marriagesA?.map((r) => r.person_b) ?? []),
        ...(marriagesB?.map((r) => r.person_a) ?? []),
      ];

      // Update spouses: same branch, same generation as current person
      if (spouseIds.length > 0) {
        const spousePayload: Record<string, unknown> = {};
        if (personBranch !== undefined) spousePayload.branch = personBranch;
        if (personGeneration != null) spousePayload.generation = personGeneration;

        if (Object.keys(spousePayload).length > 0) {
          const { error: spouseError } = await supabase
            .from("persons")
            .update(spousePayload)
            .in("id", spouseIds);

          if (spouseError) {
            console.error("Error syncing spouses:", spouseError);
          } else {
            updatedCount += spouseIds.length;
          }
        }
      }

      // 2. Find all children (biological/adopted where this person is person_a = parent)
      const { data: childRels } = await supabase
        .from("relationships")
        .select("person_b")
        .eq("person_a", personId)
        .in("type", ["biological_child", "adopted_child"]);

      const childIds = childRels?.map((r) => r.person_b) ?? [];

      // Update children: same branch, generation = parent + 1, and birth_order by gender
      if (childIds.length > 0) {
        // Fetch children person records to get gender and order
        const { data: children } = await supabase
          .from("persons")
          .select("id, gender, created_at")
          .in("id", childIds)
          .order("created_at", { ascending: true });

        if (children && children.length > 0) {
          // Assign birth_order per gender
          let maleOrder = 0;
          let femaleOrder = 0;

          for (const child of children) {
            const payload: Record<string, unknown> = {};
            if (personBranch !== undefined) payload.branch = personBranch;
            if (personGeneration != null) {
              payload.generation = personGeneration + 1;
            }

            if (child.gender === "male") {
              maleOrder++;
              payload.birth_order = maleOrder;
            } else if (child.gender === "female") {
              femaleOrder++;
              payload.birth_order = femaleOrder;
            }

            const { error: childError } = await supabase
              .from("persons")
              .update(payload)
              .eq("id", child.id);

            if (childError) {
              console.error("Error syncing child:", child.id, childError);
            } else {
              updatedCount++;
            }
          }
        }
      }

      setResult({
        type: "success",
        message: `Đã đồng bộ ${updatedCount} người (${spouseIds.length} vợ/chồng, ${childIds.length} con).`,
      });
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setResult({
        type: "error",
        message: "Lỗi đồng bộ: " + e.message,
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <>
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`flex items-center gap-1.5 font-medium text-sm transition-all disabled:opacity-50 ${className}`}
        title="Đồng bộ nhánh và đời cho vợ/chồng và con cái"
      >
        <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">
          {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
        </span>
      </button>
      {result && (
        <span
          className={`text-xs font-medium ${result.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {result.message}
        </span>
      )}
    </>
  );
}

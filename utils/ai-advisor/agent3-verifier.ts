import type { PersonSearchResult, VerificationResult } from "@/types/ai-advisor";

const MULTI_MATCH_THRESHOLD = 2;

export function verifyCandidates(
  candidates: PersonSearchResult[]
): VerificationResult {
  if (candidates.length === 0) {
    return { status: "FOUND_NONE" };
  }

  if (candidates.length === 1) {
    return { status: "FOUND_ONE", subject: candidates[0] };
  }

  // Check if first result is significantly better than second
  // (score gap > 0.2 means the top result is likely the right person)
  const topScore = candidates[0].score;
  const secondScore = candidates[1].score;
  if (
    topScore - secondScore > 0.2 &&
    candidates.length < MULTI_MATCH_THRESHOLD + 1
  ) {
    return { status: "FOUND_ONE", subject: candidates[0] };
  }

  return { status: "FOUND_MANY", candidates };
}

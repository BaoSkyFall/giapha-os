import type { PersonSearchResult, VerificationResult } from "@/types/ai-advisor";

// Only ask for disambiguation when there are 2+ genuinely close-scoring candidates
const AUTO_PICK_GAP = 0.1;         // score gap — top wins automatically if wider
const HIGH_CONFIDENCE_SCORE = 0.85; // if top score ≥ this, auto-pick regardless

export function verifyCandidates(
  candidates: PersonSearchResult[]
): VerificationResult {
  if (candidates.length === 0) {
    return { status: "FOUND_NONE" };
  }

  if (candidates.length === 1) {
    return { status: "FOUND_ONE", subject: candidates[0] };
  }

  const topScore = candidates[0].score;
  const secondScore = candidates[1].score;

  // Auto-pick if top result is highly confident
  if (topScore >= HIGH_CONFIDENCE_SCORE) {
    return { status: "FOUND_ONE", subject: candidates[0] };
  }

  // Auto-pick if top result is significantly better than second
  if (topScore - secondScore > AUTO_PICK_GAP) {
    return { status: "FOUND_ONE", subject: candidates[0] };
  }

  // Genuinely ambiguous — ask user to disambiguate
  return { status: "FOUND_MANY", candidates };
}

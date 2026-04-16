type ProfileCompletionShape = {
  full_name?: string | null;
  birth_year?: number | null;
  branch?: string | null;
  generation?: number | null;
};

export const FALLBACK_BRANCH_OPTIONS = [
  "Phái Nhất - Chi Nhất",
  "Phái Nhất - Chi Hai",
  "Phái Nhất - Chi Ba",
  "Phái Nhất - Chi Tư",
  "Phái Nhất - Chi Năm",
  "Phái Nhì - Chi Nhất",
  "Phái Nhì - Chi Hai",
  "Phái Nhì - Chi Ba",
  "Phái Nhì - Chi Tư",
  "Phái Nhì - Chi Năm",
  "Phái Ba",
];

export const FALLBACK_GENERATION_OPTIONS = Array.from(
  { length: 15 },
  (_, index) => index + 1,
);

export const isMemberProfileComplete = (
  profile: ProfileCompletionShape | null | undefined,
) => {
  if (!profile) return false;

  const fullName = profile.full_name?.trim();
  const branch = profile.branch?.trim();
  const birthYear = profile.birth_year;
  const generation = profile.generation;

  return (
    Boolean(fullName) &&
    Number.isInteger(birthYear) &&
    (birthYear || 0) > 0 &&
    Boolean(branch) &&
    Number.isInteger(generation) &&
    (generation || 0) > 0
  );
};

export const buildBranchOptions = (branches: Array<string | null | undefined>) => {
  void branches;
  return FALLBACK_BRANCH_OPTIONS;
};

export const buildGenerationOptions = (
  generations: Array<number | null | undefined>,
) => {
  void generations;
  return FALLBACK_GENERATION_OPTIONS;
};

export const isAllowedBranch = (branch: string) =>
  FALLBACK_BRANCH_OPTIONS.includes(branch);

export const isAllowedGeneration = (generation: number) =>
  Number.isInteger(generation) &&
  generation >= 1 &&
  generation <= FALLBACK_GENERATION_OPTIONS.length;

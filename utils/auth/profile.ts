type ProfileCompletionShape = {
  full_name?: string | null;
  birth_year?: number | null;
  branch?: string | null;
  generation?: number | null;
};

export const FALLBACK_BRANCH_OPTIONS = [
  "Chi 1",
  "Chi 2",
  "Chi 3",
  "Chi 4",
  "Chi 5",
];

export const FALLBACK_GENERATION_OPTIONS = Array.from(
  { length: 12 },
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
  const normalized = branches
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  const unique = Array.from(new Set(normalized)).sort((a, b) =>
    a.localeCompare(b, "vi"),
  );

  if (unique.length > 0) return unique;
  return FALLBACK_BRANCH_OPTIONS;
};

export const buildGenerationOptions = (
  generations: Array<number | null | undefined>,
) => {
  const normalized = generations.filter(
    (value): value is number =>
      typeof value === "number" && Number.isInteger(value) && value > 0,
  );

  const unique = Array.from(new Set(normalized)).sort((a, b) => a - b);

  if (unique.length > 0) return unique;
  return FALLBACK_GENERATION_OPTIONS;
};

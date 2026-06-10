export const normalizeForSearch = (value: string | null | undefined) => {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
};

// Tokens for server-side search against the normalized `name_search` column
// (docs/members-search-migration.sql). Mirrors normalizeForSearch so that
// `name_search ILIKE '%token%'` for every token === the JS matchesSearchQuery.
export const tokenizeForSearch = (value: string | null | undefined): string[] =>
  normalizeForSearch(value).split(" ").filter(Boolean);

export const matchesSearchQuery = (
  haystackParts: Array<string | number | null | undefined>,
  query: string | null | undefined,
) => {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;

  const searchableText = normalizeForSearch(
    haystackParts
      .filter((part) => part !== null && part !== undefined)
      .map((part) => String(part))
      .join(" "),
  );

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => searchableText.includes(token));
};

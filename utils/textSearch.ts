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

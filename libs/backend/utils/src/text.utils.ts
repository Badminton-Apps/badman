/**
 * Text utility functions for search and normalization
 */

/**
 * Normalizes text by removing diacritics and accents while preserving case
 * @param text - The text to normalize
 * @returns Normalized text without diacritics
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD") // Decompose characters with diacritics
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s]/g, " ") // Replace special characters with spaces
    .replace(/\s+/g, " ") // Normalize multiple spaces to single space
    .trim();
}

/**
 * Creates search terms that include both normalized and original text
 * @param query - The search query
 * @returns Array of search terms
 */
export function createSearchTerms(query: string): string[] {
  if (!query || typeof query !== "string") {
    return [];
  }

  const originalQuery = query.toLowerCase().trim();
  const normalizedQuery = normalizeText(originalQuery);

  // Split by spaces and filter out empty strings
  const originalParts = originalQuery.split(/\s+/).filter((part) => part.length > 0);

  const normalizedParts = normalizedQuery.split(/\s+/).filter((part) => part.length > 0);

  // Combine and deduplicate parts
  const allParts = [...originalParts, ...normalizedParts];
  return [...new Set(allParts)].filter((part) => part.length > 0);
}

/**
 * Creates SQL condition for database search using unaccent for PostgreSQL
 * @param query - The search query
 * @param fieldNames - Array of field names to search in
 * @param likeOperator - SQL LIKE operator ('LIKE' or 'ILIKE')
 * @returns SQL condition string and replacements object
 */
export function createSearchCondition(
  query: string,
  fieldNames: string[],
  likeOperator: "LIKE" | "ILIKE" = "ILIKE"
): { condition: string; replacements: Record<string, string> } {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return { condition: "", replacements: {} };
  }

  const normalizedQuery = normalizeText(query.toLowerCase().trim());
  const terms = normalizedQuery.split(/\s+/).filter((part) => part.length > 0);

  if (terms.length === 0) {
    return { condition: "", replacements: {} };
  }

  const replacements: Record<string, string> = {};
  const conditions = terms.map((term, index) => {
    const paramName = `term${index}`;
    replacements[paramName] = `%${term}%`;

    const fieldConditions = fieldNames
      .map((fieldName) => `unaccent("${fieldName}") ${likeOperator} unaccent(:${paramName})`)
      .join(" OR ");

    return `(${fieldConditions})`;
  });

  const condition = conditions.join(" AND ");
  return { condition, replacements };
}

/**
 * Creates replacements object for SQL query parameters
 * @param searchTerms - Array of search terms
 * @returns Object with parameter replacements
 */
export function createSearchReplacements(searchTerms: string[]): Record<string, string> {
  const replacements: Record<string, string> = {};
  searchTerms.forEach((term, index) => {
    replacements[`term${index}`] = `%${term}%`;
  });
  return replacements;
}

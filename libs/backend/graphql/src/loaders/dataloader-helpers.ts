/**
 * Shared utilities for request-scoped DataLoader batch functions.
 *
 * Every DataLoader-style batch function in this folder MUST return an array
 * with the **same length** as its input keys and where **output[i] is the
 * row whose key === keys[i]** (or `null` if no such row exists). DataLoader
 * enforces the length invariant at runtime; the order invariant is silently
 * critical — getting it wrong returns the wrong row to the caller and can
 * leak data across users in concurrent requests.
 *
 * Use {@link reindexByKey} for the row → key mapping so the contract lives in
 * one tested place. Do NOT filter, sort, slice, or otherwise transform the
 * output of a batch function.
 */

/**
 * Re-index `rows` so the returned array lines up positionally with `keys`.
 *
 * @invariant Output array has the same length as `keys`.
 * @invariant Output[i] is the row whose `keyOf(row) === keys[i]`, or `null` if
 *   no such row exists in `rows`.
 *
 * @remarks
 * - If `rows` contains multiple entries with the same key, the **last** one
 *   wins (matches Sequelize `HasOne` semantics).
 * - Callers MUST NOT add `.filter` / `.sort` / `.slice` to the returned array
 *   — doing so breaks the DataLoader contract. Per-row filtering belongs in
 *   the field resolver via a separate query, not in a batch function.
 */
export function reindexByKey<K, V>(
  keys: readonly K[],
  rows: readonly V[],
  keyOf: (row: V) => K | null | undefined
): (V | null)[] {
  const map = new Map<K, V>();
  for (const row of rows) {
    const k = keyOf(row);
    if (k !== null && k !== undefined) {
      map.set(k, row);
    }
  }
  return keys.map((k) => map.get(k) ?? null);
}

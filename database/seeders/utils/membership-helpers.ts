import { SeederContext } from "./seeder-context";

/**
 * Check if an active membership exists (generic for any membership table with "end" column).
 */
export async function hasActiveMembership<T extends { id: string }>(
  ctx: SeederContext,
  table: string,
  whereClause: string,
  replacements: Record<string, unknown>
): Promise<T | null> {
  const existing = await ctx.query<T>(
    `SELECT id FROM "${table}" WHERE ${whereClause} AND "end" IS NULL LIMIT 1`,
    replacements
  );

  return existing && existing.length > 0 ? existing[0] : null;
}

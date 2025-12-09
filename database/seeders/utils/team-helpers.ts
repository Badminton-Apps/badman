import { SeederContext } from "./seeder-context";
import type { Club } from "./types";

/**
 * Fetch club data by ID
 */
export async function getClubById(ctx: SeederContext, clubId: string): Promise<Club> {
  const clubData = await ctx.query<Club>(
    `SELECT name, abbreviation FROM "Clubs" WHERE id = :clubId LIMIT 1`,
    { clubId }
  );

  if (!clubData || clubData.length === 0) {
    throw new Error(`Club with id ${clubId} not found`);
  }

  return clubData[0];
}

/**
 * Generate team name and abbreviation from club data
 */
export function generateTeamName(
  club: Club,
  teamNumber: number,
  type: string,
  letter = "H"
): { name: string; abbreviation: string } {
  const name = `${club.name} ${teamNumber}${letter}`;
  const abbreviation = `${club.abbreviation} ${teamNumber}${letter}`;
  return { name, abbreviation };
}

/**
 * Check if an active membership exists
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

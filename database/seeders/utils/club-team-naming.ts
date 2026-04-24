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
  type: "M" | "F" | "MX"
): { name: string; abbreviation: string } {
  const name = `${club.name} ${teamNumber}${type}`;
  const abbreviation = `${club.abbreviation} ${teamNumber}${type}`;
  return { name, abbreviation };
}

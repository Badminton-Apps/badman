"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClubById = getClubById;
exports.generateTeamName = generateTeamName;
exports.hasActiveMembership = hasActiveMembership;
/**
 * Fetch club data by ID
 */
async function getClubById(ctx, clubId) {
    const clubData = await ctx.query(`SELECT name, abbreviation FROM "Clubs" WHERE id = :clubId LIMIT 1`, { clubId });
    if (!clubData || clubData.length === 0) {
        throw new Error(`Club with id ${clubId} not found`);
    }
    return clubData[0];
}
/**
 * Generate team name and abbreviation from club data
 */
function generateTeamName(club, teamNumber, type, letter = "H") {
    const name = `${club.name} ${teamNumber}${letter}`;
    const abbreviation = `${club.abbreviation} ${teamNumber}${letter}`;
    return { name, abbreviation };
}
/**
 * Check if an active membership exists
 */
async function hasActiveMembership(ctx, table, whereClause, replacements) {
    const existing = await ctx.query(`SELECT id FROM "${table}" WHERE ${whereClause} AND "end" IS NULL LIMIT 1`, replacements);
    return existing && existing.length > 0 ? existing[0] : null;
}

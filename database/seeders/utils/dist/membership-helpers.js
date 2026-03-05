"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasActiveMembership = hasActiveMembership;
/**
 * Check if an active membership exists (generic for any membership table with "end" column).
 */
async function hasActiveMembership(ctx, table, whereClause, replacements) {
    const existing = await ctx.query(`SELECT id FROM "${table}" WHERE ${whereClause} AND "end" IS NULL LIMIT 1`, replacements);
    return existing && existing.length > 0 ? existing[0] : null;
}

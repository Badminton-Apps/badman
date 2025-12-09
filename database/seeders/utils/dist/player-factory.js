"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerFactory = void 0;
const entity_builders_1 = require("./entity-builders");
const ranking_builders_1 = require("./ranking-builders");
const data_factory_1 = require("./data-factory");
/**
 * PlayerFactory provides utilities for creating players in seeders and tests
 */
class PlayerFactory {
    /**
     * Create a single player with optional overrides
     */
    static async create(ctx, options = {}) {
        const { email, firstName, lastName, memberId, gender = "M", domain = "example.com", prefix = "test", sub = "", ranking, skipRanking = false, } = options;
        // Generate defaults if not provided
        const finalEmail = email || data_factory_1.DataFactory.generateEmail(prefix, domain);
        const name = firstName && lastName ? { firstName, lastName } : data_factory_1.DataFactory.generateName();
        const finalMemberId = memberId || data_factory_1.DataFactory.generateMemberId(prefix.toUpperCase());
        const player = await (0, entity_builders_1.findOrCreatePlayer)(ctx, finalEmail, name.firstName, name.lastName, finalMemberId, gender, true, // competitionPlayer
        sub);
        // Add ranking if not skipped
        if (!skipRanking) {
            await (0, ranking_builders_1.addRankingToPlayer)(ctx, player.id, {
                single: ranking?.single,
                double: ranking?.double,
                mix: ranking?.mix,
            });
        }
        return player;
    }
    /**
     * Create multiple players at once
     */
    static async createMany(ctx, options) {
        const { count, gender = "mixed", domain = "example.com", prefix = "test", baseIndex = 0, skipRanking = false, } = options;
        const players = [];
        for (let i = 0; i < count; i++) {
            const index = baseIndex + i;
            const name = data_factory_1.DataFactory.generateNameAtIndex(index);
            // Determine gender for this player
            let playerGender;
            if (gender === "mixed") {
                // Alternate between M and F
                playerGender = index % 2 === 0 ? "M" : "F";
            }
            else {
                playerGender = gender;
            }
            const player = await this.create(ctx, {
                email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@${domain}`,
                firstName: name.firstName,
                lastName: name.lastName,
                memberId: `${prefix.toUpperCase()}-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                gender: playerGender,
                domain,
                prefix,
                skipRanking,
            });
            players.push(player);
        }
        return players;
    }
    /**
     * Create players for a specific team/club
     */
    static async createForTeam(ctx, teamName, count, options = {}) {
        const domain = options.domain || `${teamName.toLowerCase().replace(/\s+/g, "")}.com`;
        const prefix = options.prefix || teamName.toUpperCase().replace(/\s+/g, "-");
        return this.createMany(ctx, {
            count,
            domain,
            prefix,
            ...options,
        });
    }
}
exports.PlayerFactory = PlayerFactory;

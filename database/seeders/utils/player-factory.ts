import { SeederContext } from "./seeder-context";
import { findOrCreatePlayer } from "./entity-builders";
import { addRankingToPlayer } from "./ranking-builders";
import { DataFactory } from "./data-factory";
import type { Player } from "./types";

/**
 * Options for creating a player
 */
export interface CreatePlayerOptions {
  email?: string;
  firstName?: string;
  lastName?: string;
  memberId?: string;
  gender?: "M" | "F";
  domain?: string;
  prefix?: string;
  sub?: string;
  ranking?: {
    single?: number;
    double?: number;
    mix?: number;
  };
  skipRanking?: boolean;
}

/**
 * Options for creating multiple players
 */
export interface CreatePlayersOptions {
  count: number;
  gender?: "M" | "F" | "mixed";
  domain?: string;
  prefix?: string;
  baseIndex?: number;
  skipRanking?: boolean;
}

/**
 * PlayerFactory provides utilities for creating players in seeders and tests
 */
export class PlayerFactory {
  /**
   * Create a single player with optional overrides
   */
  static async create(ctx: SeederContext, options: CreatePlayerOptions = {}): Promise<Player> {
    const {
      email,
      firstName,
      lastName,
      memberId,
      gender = "M",
      domain = "example.com",
      prefix = "test",
      sub = "",
      ranking,
      skipRanking = false,
    } = options;

    // Generate defaults if not provided
    const finalEmail = email || DataFactory.generateEmail(prefix, domain);
    const name = firstName && lastName ? { firstName, lastName } : DataFactory.generateName();
    const finalMemberId = memberId || DataFactory.generateMemberId(prefix.toUpperCase());

    const player = await findOrCreatePlayer(
      ctx,
      finalEmail,
      name.firstName,
      name.lastName,
      finalMemberId,
      gender,
      true, // competitionPlayer
      sub
    );

    // Add ranking if not skipped
    if (!skipRanking) {
      await addRankingToPlayer(ctx, player.id, {
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
  static async createMany(ctx: SeederContext, options: CreatePlayersOptions): Promise<Player[]> {
    const {
      count,
      gender = "mixed",
      domain = "example.com",
      prefix = "test",
      baseIndex = 0,
      skipRanking = false,
    } = options;

    const players: Player[] = [];

    for (let i = 0; i < count; i++) {
      const index = baseIndex + i;
      const name = DataFactory.generateNameAtIndex(index);

      // Determine gender for this player
      let playerGender: "M" | "F";
      if (gender === "mixed") {
        // Alternate between M and F
        playerGender = index % 2 === 0 ? "M" : "F";
      } else {
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
  static async createForTeam(
    ctx: SeederContext,
    teamName: string,
    count: number,
    options: Omit<CreatePlayersOptions, "count"> = {}
  ): Promise<Player[]> {
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

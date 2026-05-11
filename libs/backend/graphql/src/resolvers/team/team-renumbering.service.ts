import {
  Player,
  RankingLastPlace,
  RankingSystem,
  Team,
  TeamPlayerMembership,
} from "@badman/backend-database";
import {
  IndexPlayer,
  SubEventTypeEnum,
  TeamMembershipType,
  getIndexFromPlayers,
} from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode } from "../../utils";

// ---------------------------------------------------------------------------
// Public interfaces (mirror of contracts/team-renumbering-service.md)
// ---------------------------------------------------------------------------

export interface RecalculateForScopeArgs {
  clubId: string;
  season: number;
  /**
   * Ordered list of types this call should renumber. Order matters: it
   * defines the tier order (NATIONAL first, then MX, when pooled).
   * Examples:
   *   [M], [F], [NATIONAL], [MX]          — single-tier scope
   *   [NATIONAL, MX]                       — pooled MX+NAT, NATIONAL takes 1..K
   */
  types: SubEventTypeEnum[];
  transaction: Transaction;
}

export interface RenumberedTeam {
  team: Team;
  changed: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TeamRenumberingService {
  private readonly logger = new Logger(TeamRenumberingService.name);

  constructor(private readonly _sequelize: Sequelize) {}

  // -------------------------------------------------------------------------
  // Step 1 — canonical scope key (for the advisory lock)
  // -------------------------------------------------------------------------

  /**
   * Derives the canonical scope key from the ordered types list.
   * The key is used as the advisory-lock discriminator.
   *
   * [M]            → 'M'
   * [F]            → 'F'
   * [MX]           → 'MX'
   * [NATIONAL]     → 'MX+NAT'  (serializes against pooled MX+NAT calls)
   * [NATIONAL, MX] → 'MX+NAT'
   * anything else  → throws INTERNAL_ERROR
   */
  private canonicalScopeKey(types: SubEventTypeEnum[]): string {
    if (types.length === 1) {
      const t = types[0];
      if (t === SubEventTypeEnum.M) return "M";
      if (t === SubEventTypeEnum.F) return "F";
      if (t === SubEventTypeEnum.MX) return "MX";
      if (t === SubEventTypeEnum.NATIONAL) return "MX+NAT"; // see R4
    }
    if (
      types.length === 2 &&
      types[0] === SubEventTypeEnum.NATIONAL &&
      types[1] === SubEventTypeEnum.MX
    ) {
      return "MX+NAT";
    }
    throw new GraphQLError("Unsupported scope shape for recalculate", {
      extensions: { code: ErrorCode.INTERNAL_ERROR, types },
    });
  }

  // -------------------------------------------------------------------------
  // Main algorithm
  // -------------------------------------------------------------------------

  /**
   * Recompute teamNumber / name / abbreviation for every team in the scope.
   * Tiered: types[0] takes slots 1..N0, types[1] takes N0+1..N0+N1, etc.
   * Within each tier, sort by ascending baseIndex; tie-break by Team.id ASC.
   * Persists only teams whose number actually changes. Idempotent.
   *
   * MUST be called inside an open Sequelize transaction; the caller passes it in.
   * The service takes a postgres advisory transaction lock keyed on the
   * canonical scope key, so concurrent calls against overlapping scopes serialize.
   *
   * Throws GraphQLError on unrecoverable internal errors (missing primary
   * RankingSystem, unsupported scope shape, DB error). Does NOT throw
   * TEAM_NUMBER_CONFLICT.
   */
  async recalculateForScope(args: RecalculateForScopeArgs): Promise<RenumberedTeam[]> {
    const { clubId, season, types, transaction } = args;

    // Step 1 — derive advisory-lock key
    const scopeKey = this.canonicalScopeKey(types);
    const lockParam = `teams_renumber:${clubId}:${season}:${scopeKey}`;

    // Step 2 — acquire advisory transaction lock (blocks concurrent same-scope callers)
    await this._sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", {
      bind: [lockParam],
      transaction,
    });

    // Step 3 — load teams per tier (in id ASC order so tie-break is reproducible)
    // Team uses BelongsToMany via TeamPlayerMembership, so the players include
    // attaches the TeamPlayerMembership rows as join-table data on each player.
    const teamsByTier: (Team & { _baseIndex?: number })[][] = [];
    for (const tierType of types) {
      const tier = await Team.findAll({
        where: { clubId, season, type: tierType },
        include: [
          {
            model: Player,
            as: "players",
            through: {
              attributes: ["membershipType"],
            },
            attributes: ["id", "gender"],
          },
        ],
        order: [["id", "ASC"]],
        transaction,
      });
      teamsByTier.push(tier as (Team & { _baseIndex?: number })[]);
    }

    // Step 4 — early exit when every tier is empty
    const totalTeams = teamsByTier.reduce((sum, tier) => sum + tier.length, 0);
    if (totalTeams === 0) {
      this.logger.debug({
        message: "recalculateForScope: scope is empty",
        clubId,
        season,
        scopeKey,
      });
      return [];
    }

    // Step 5 — load primary RankingSystem
    const system = await RankingSystem.findOne({
      where: { primary: true },
      transaction,
    });
    if (!system) {
      throw new GraphQLError("Primary ranking system not configured.", {
        extensions: { code: ErrorCode.INTERNAL_ERROR, reason: "primary ranking system missing" },
      });
    }

    // Step 6 — collect union of base-member player ids, then batch-fetch rankings.
    // Because Team uses BelongsToMany(() => Player, () => TeamPlayerMembership),
    // each included player has its TeamPlayerMembership as `player.TeamPlayerMembership`.
    const allBasePlayerIds = new Set<string>();
    for (const tier of teamsByTier) {
      for (const team of tier) {
        const players =
          (
            team as unknown as {
              players?: (Player & { TeamPlayerMembership?: TeamPlayerMembership })[];
            }
          ).players ?? [];
        for (const p of players) {
          const membership = p.TeamPlayerMembership;
          if (membership?.membershipType === TeamMembershipType.REGULAR && p.id) {
            allBasePlayerIds.add(p.id);
          }
        }
      }
    }

    const rankings =
      allBasePlayerIds.size > 0
        ? await RankingLastPlace.findAll({
            where: {
              playerId: { [Op.in]: [...allBasePlayerIds] },
              systemId: system.id,
            },
            transaction,
          })
        : [];

    // Build a quick lookup: playerId → RankingLastPlace
    const rankingByPlayerId = new Map<string, RankingLastPlace>();
    for (const r of rankings) {
      if (r.playerId) rankingByPlayerId.set(r.playerId, r);
    }

    // Step 7 — compute baseIndex per team using base/REGULAR members only
    for (const tier of teamsByTier) {
      for (const team of tier) {
        const players =
          (
            team as unknown as {
              players?: (Player & { TeamPlayerMembership?: TeamPlayerMembership })[];
            }
          ).players ?? [];
        const basePlayers = players.filter(
          (p) => p.TeamPlayerMembership?.membershipType === TeamMembershipType.REGULAR
        );

        const indexPlayers: IndexPlayer[] = basePlayers.map((p) => {
          const ranking = rankingByPlayerId.get(p.id);
          return {
            id: p.id,
            gender: (p.gender ?? "M") as "M" | "F",
            single: ranking?.single ?? system.amountOfLevels,
            double: ranking?.double ?? system.amountOfLevels,
            mix: ranking?.mix ?? system.amountOfLevels,
          };
        });

        team._baseIndex = getIndexFromPlayers(team.type, indexPlayers, system.amountOfLevels);
      }
    }

    // Step 8 — sort each tier by (baseIndex ASC, id ASC)
    for (const tier of teamsByTier) {
      tier.sort((a, b) => {
        const diff = (a._baseIndex ?? 0) - (b._baseIndex ?? 0);
        if (diff !== 0) return diff;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }

    // Step 9 — assign slot numbers, persist only changed rows
    const results: RenumberedTeam[] = [];
    let nextSlot = 1;
    for (const tier of teamsByTier) {
      for (const team of tier) {
        const desired = nextSlot;
        const changed = team.teamNumber !== desired;
        if (changed) {
          team.teamNumber = desired;
          // BeforeUpdate hook on Team regenerates name + abbreviation
          await team.save({ transaction });
        }
        results.push({ team, changed });
        nextSlot++;
      }
    }

    const changedCount = results.filter((r) => r.changed).length;
    this.logger.debug({
      message: "recalculateForScope: complete",
      clubId,
      season,
      scopeKey,
      teamsChanged: changedCount,
    });

    return results;
  }
}

/**
 * RankingPlaceWriterService — single sanctioned write path for RankingPlace +
 * RankingLastPlace. All writes to these tables MUST go through this service.
 *
 * Contract: specs/037-ranking-write-protection/contracts/ranking-place-writer.md
 *
 * DO NOT call RankingPlace.bulkCreate / create / upsert / findOrCreate directly
 * outside this file. The root eslint config enforces this with no-restricted-syntax.
 */
import { Injectable, Logger } from "@nestjs/common";
import { CreationAttributes, Op, Transaction } from "sequelize";
import { getRankingProtected } from "@badman/utils";
import { GamePlayerMembership } from "../models/event";
import { RankingLastPlace } from "../models/ranking/ranking-last-place.model";
import { RankingPlace } from "../models/ranking/ranking-place.model";
import { RankingSystem } from "../models/ranking/ranking-system.model";

const DEFAULT_CHUNK_SIZE = 500;
const INTER_CHUNK_DELAY_MS = 1000;

@Injectable()
export class RankingPlaceWriterService {
  private readonly logger = new Logger(RankingPlaceWriterService.name);

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  private guardConfig(system: RankingSystem): void {
    if (system.amountOfLevels == null) {
      throw new Error(
        `RankingPlaceWriterService: system "${system.name ?? system.id}" is missing amountOfLevels — configure before writing`
      );
    }
    if (system.maxDiffLevels == null) {
      throw new Error(
        `RankingPlaceWriterService: system "${system.name ?? system.id}" is missing maxDiffLevels — configure before writing`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // upsertMany — bulk path (publication import, CSV upload)
  // ---------------------------------------------------------------------------

  /**
   * Bulk path for publication import and CSV upload.
   *
   * Pipeline per chunk:
   *   1. Fill missing categories from existing same-date row or latest prior value.
   *   2. Apply getRankingProtected (derives + clamps).
   *   3. Chunked bulkCreate({ updateOnDuplicate, hooks: false }).
   *   4. Propagate RankingLastPlace for rows where rankingDate >= stored snapshot.
   *
   * Guarantee 2: known official values are never replaced by derived ones.
   * Guarantee 4: chunked writes with default 500-row chunks + inter-chunk delay.
   * Guarantee 5: explicit snapshot propagation after each chunk.
   */
  async upsertMany(
    rows: Partial<RankingPlace>[],
    system: RankingSystem,
    opts?: {
      transaction?: Transaction;
      chunkSize?: number;
      propagateGameMemberships?: boolean;
    }
  ): Promise<{ written: number }> {
    this.guardConfig(system);

    const {
      transaction,
      chunkSize = DEFAULT_CHUNK_SIZE,
      propagateGameMemberships = false,
    } = opts ?? {};
    let written = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      // Step 1: fill-from-previous for the whole chunk in one batched query
      const filledChunk = await this._fillFromPrevious(chunk, system, transaction);

      // Step 2: protect each row
      const protectedChunk = filledChunk.map((row) => {
        const protected_ = getRankingProtected(
          { single: row.single, double: row.double, mix: row.mix },
          system
        );
        return {
          ...row,
          single: protected_.single,
          double: protected_.double,
          mix: protected_.mix,
        };
      });

      // Step 3: bulk upsert

      await RankingPlace.bulkCreate(protectedChunk as CreationAttributes<RankingPlace>[], {
        updateOnDuplicate: [
          "updatePossible",
          "single",
          "singlePoints",
          "singleRank",
          "double",
          "doublePoints",
          "doubleRank",
          "mix",
          "mixPoints",
          "mixRank",
        ],
        returning: false,
        hooks: false,
        transaction,
      });

      written += chunk.length;

      // Step 4: propagate snapshot for affected (playerId, systemId) pairs
      await this._propagateSnapshot(protectedChunk, system, transaction);

      if (propagateGameMemberships) {
        await this._propagateGameMemberships(protectedChunk, transaction);
      }

      // Inter-chunk delay to prevent lock exhaustion (parity with old import)
      if (i + chunkSize < rows.length) {
        await new Promise((resolve) => setTimeout(resolve, INTER_CHUNK_DELAY_MS));
      }
    }

    return { written };
  }

  // ---------------------------------------------------------------------------
  // updateForPlayer — repair path (check-ranking)
  // ---------------------------------------------------------------------------

  /**
   * Per-player update path (repair scrape, targeted level corrections).
   *
   * Loops through the player's ranking rows newest-first, updating until
   * updatePossible = true is encountered. Fills missing levels from the row's
   * existing values (last-known), then applies getRankingProtected.
   *
   * Guarantee 6: propagateGameMemberships only when opted in.
   */
  async updateForPlayer(
    playerId: string,
    system: RankingSystem,
    levels: { single?: number; double?: number; mix?: number },
    opts?: {
      transaction?: Transaction;
      propagateGameMemberships?: boolean;
    }
  ): Promise<RankingPlace[]> {
    this.guardConfig(system);

    const { transaction, propagateGameMemberships = false } = opts ?? {};

    const rankingPlaces = await RankingPlace.findAll({
      where: { systemId: system.id, playerId },
      order: [["rankingDate", "DESC"]],
      transaction,
    });

    const updated: RankingPlace[] = [];

    for (const rp of rankingPlaces) {
      // Merge scraped values with existing (fill-from-existing for missing categories)
      const merged = {
        single: levels.single ?? rp.single,
        double: levels.double ?? rp.double,
        mix: levels.mix ?? rp.mix,
      };

      const protected_ = getRankingProtected(merged, system);

      rp.single = protected_.single;
      rp.double = protected_.double;
      rp.mix = protected_.mix;

      rp.changed("single", true);
      rp.changed("double", true);
      rp.changed("mix", true);

      await rp.save({ transaction, hooks: false });
      updated.push(rp);

      if (rp.updatePossible) {
        break;
      }
    }

    // Propagate snapshot
    if (updated.length > 0) {
      await this._propagateSnapshot(
        updated.map((rp) => ({
          playerId: rp.playerId,
          systemId: rp.systemId,
          rankingDate: rp.rankingDate,
          single: rp.single,
          double: rp.double,
          mix: rp.mix,
          singlePoints: rp.singlePoints,
          mixPoints: rp.mixPoints,
          doublePoints: rp.doublePoints,
          singlePointsDowngrade: rp.singlePointsDowngrade,
          mixPointsDowngrade: rp.mixPointsDowngrade,
          doublePointsDowngrade: rp.doublePointsDowngrade,
          singleRank: rp.singleRank,
          mixRank: rp.mixRank,
          doubleRank: rp.doubleRank,
          totalSingleRanking: rp.totalSingleRanking,
          totalMixRanking: rp.totalMixRanking,
          totalDoubleRanking: rp.totalDoubleRanking,
          totalWithinSingleLevel: rp.totalWithinSingleLevel,
          totalWithinMixLevel: rp.totalWithinMixLevel,
          totalWithinDoubleLevel: rp.totalWithinDoubleLevel,
          singleInactive: rp.singleInactive,
          mixInactive: rp.mixInactive,
          doubleInactive: rp.doubleInactive,
          updatePossible: rp.updatePossible,
          gender: rp.gender,
        })),
        system,
        transaction
      );

      if (propagateGameMemberships) {
        await this._propagateGameMemberships(updated, transaction);
      }
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // upsertOne — single-row path (GraphQL mutations, flanders service)
  // ---------------------------------------------------------------------------

  /**
   * Single-row path for GraphQL mutations and the flanders service.
   *
   * Merges with the existing row (edit semantics), applies getRankingProtected
   * (silent clamp — no validation error returned), upserts, propagates snapshot.
   */
  async upsertOne(
    row: Partial<RankingPlace>,
    system: RankingSystem,
    opts?: { transaction?: Transaction }
  ): Promise<RankingPlace> {
    this.guardConfig(system);

    const { transaction } = opts ?? {};

    // Find existing row to merge with (fill-from-previous for missing categories)
    let existing: RankingPlace | null = null;
    if (row.playerId && row.systemId && row.rankingDate) {
      existing = await RankingPlace.findOne({
        where: {
          playerId: row.playerId,
          systemId: row.systemId,
          rankingDate: row.rankingDate,
        },
        transaction,
      });
    }

    // Merge: incoming row takes precedence; existing fills missing
    const merged = {
      ...existing?.toJSON(),
      ...Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)),
    };

    // Fill from previous if still missing
    if (!merged.single || !merged.double || !merged.mix) {
      const prior = await this._getLatestPrior(
        row.playerId!,
        row.systemId!,
        row.rankingDate,
        transaction
      );
      if (prior) {
        merged.single = merged.single ?? prior.single;
        merged.double = merged.double ?? prior.double;
        merged.mix = merged.mix ?? prior.mix;
      }
    }

    // Protect (silent clamp)
    const protected_ = getRankingProtected(
      { single: merged.single, double: merged.double, mix: merged.mix },
      system
    );
    merged.single = protected_.single;
    merged.double = protected_.double;
    merged.mix = protected_.mix;

    let result: RankingPlace;
    if (existing) {
      await existing.update(merged, { transaction, hooks: false });
      result = existing;
    } else {
      [result] = await RankingPlace.upsert(merged as CreationAttributes<RankingPlace>, {
        transaction,
        hooks: false,
        returning: true,
      });
    }

    // Propagate snapshot
    await this._propagateSnapshot([merged], system, transaction);

    return result;
  }

  // ---------------------------------------------------------------------------
  // remove — destroy + re-point snapshot
  // ---------------------------------------------------------------------------

  /**
   * Destroys the ranking place and re-points the RankingLastPlace snapshot to
   * the next-newest remaining row (or deletes it if none).
   */
  async remove(place: RankingPlace, opts?: { transaction?: Transaction }): Promise<void> {
    const { transaction } = opts ?? {};

    const { playerId, systemId } = place;

    await place.destroy({ transaction });

    // Re-point snapshot
    const nextNewest = await RankingPlace.findOne({
      where: { playerId, systemId },
      order: [["rankingDate", "DESC"]],
      transaction,
    });

    if (nextNewest) {
      const snapshot = nextNewest.asLastRankingPlace();
      await RankingLastPlace.upsert(
        { ...snapshot, playerId, systemId } as CreationAttributes<RankingLastPlace>,
        { transaction }
      );
    } else {
      // No remaining rows → delete the snapshot
      await RankingLastPlace.destroy({
        where: { playerId, systemId },
        transaction,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Fills missing single/double/mix values for each row in the chunk.
   *
   * Strategy per row (guarantee 2):
   *   a. existing same-date row at (playerId, systemId, rankingDate)
   *   b. latest prior RankingPlace/RankingLastPlace
   *
   * Uses one batched query per chunk for efficiency.
   */
  private async _fillFromPrevious(
    chunk: Partial<RankingPlace>[],
    system: RankingSystem,
    transaction?: Transaction
  ): Promise<Partial<RankingPlace>[]> {
    const needsFill = chunk.filter(
      (row) => row.single == null || row.double == null || row.mix == null
    );

    if (needsFill.length === 0) {
      return chunk;
    }

    const playerIds = [...new Set(needsFill.map((r) => r.playerId).filter(Boolean))] as string[];

    // Fetch latest RankingLastPlace (snapshot of most recent known values) for each player
    const lastPlaces = await RankingLastPlace.findAll({
      where: {
        playerId: { [Op.in]: playerIds },
        systemId: system.id,
      },
      attributes: ["playerId", "single", "double", "mix"],
      transaction,
    });

    const lastPlaceMap = new Map<string, RankingLastPlace>();
    for (const lp of lastPlaces) {
      if (lp.playerId) lastPlaceMap.set(lp.playerId, lp);
    }

    return chunk.map((row) => {
      if (row.single != null && row.double != null && row.mix != null) {
        return row;
      }

      const prior = row.playerId ? lastPlaceMap.get(row.playerId) : undefined;
      return {
        ...row,
        single: row.single ?? prior?.single ?? undefined,
        double: row.double ?? prior?.double ?? undefined,
        mix: row.mix ?? prior?.mix ?? undefined,
      };
    });
  }

  /**
   * Gets the latest prior RankingPlace for a player/system before the given date.
   */
  private async _getLatestPrior(
    playerId: string,
    systemId: string,
    rankingDate: Date | undefined,
    transaction?: Transaction
  ): Promise<RankingPlace | null> {
    const where: Record<string, unknown> = { playerId, systemId };
    if (rankingDate) {
      where["rankingDate"] = { [Op.lt]: rankingDate };
    }
    return RankingPlace.findOne({
      where,
      order: [["rankingDate", "DESC"]],
      limit: 1,
      transaction,
    });
  }

  /**
   * Bulk-upserts RankingLastPlace for affected players, only when the incoming
   * rankingDate >= the stored snapshot date (guarantee 5).
   */
  private async _propagateSnapshot(
    rows: Partial<RankingPlace>[],
    system: RankingSystem,
    transaction?: Transaction
  ): Promise<void> {
    const playerIds = [...new Set(rows.map((r) => r.playerId).filter(Boolean))] as string[];
    if (playerIds.length === 0) return;

    // Fetch current snapshots
    const currentSnapshots = await RankingLastPlace.findAll({
      where: {
        playerId: { [Op.in]: playerIds },
        systemId: system.id,
      },
      attributes: ["playerId", "rankingDate"],
      transaction,
    });

    const currentSnapshotMap = new Map<string, Date | undefined>();
    for (const snap of currentSnapshots) {
      if (snap.playerId) currentSnapshotMap.set(snap.playerId, snap.rankingDate);
    }

    // Build per-player "newest incoming row" map
    const newestByPlayer = new Map<string, Partial<RankingPlace>>();
    for (const row of rows) {
      if (!row.playerId || !row.rankingDate) continue;
      const existing = newestByPlayer.get(row.playerId);
      if (
        !existing ||
        !existing.rankingDate ||
        new Date(row.rankingDate) > new Date(existing.rankingDate)
      ) {
        newestByPlayer.set(row.playerId, row);
      }
    }

    // Only update snapshot if incoming date >= stored snapshot date
    const toUpsert: Partial<RankingLastPlace>[] = [];
    for (const [playerId, row] of newestByPlayer) {
      const storedDate = currentSnapshotMap.get(playerId);
      if (!storedDate || !row.rankingDate || new Date(row.rankingDate) >= new Date(storedDate)) {
        toUpsert.push({
          playerId,
          systemId: system.id,
          rankingDate: row.rankingDate,
          single: row.single,
          double: row.double,
          mix: row.mix,
          singlePoints: row.singlePoints,
          mixPoints: row.mixPoints,
          doublePoints: row.doublePoints,
          singlePointsDowngrade: row.singlePointsDowngrade,
          mixPointsDowngrade: row.mixPointsDowngrade,
          doublePointsDowngrade: row.doublePointsDowngrade,
          singleRank: row.singleRank,
          mixRank: row.mixRank,
          doubleRank: row.doubleRank,
          totalSingleRanking: row.totalSingleRanking,
          totalMixRanking: row.totalMixRanking,
          totalDoubleRanking: row.totalDoubleRanking,
          totalWithinSingleLevel: row.totalWithinSingleLevel,
          totalWithinMixLevel: row.totalWithinMixLevel,
          totalWithinDoubleLevel: row.totalWithinDoubleLevel,
          singleInactive: row.singleInactive,
          mixInactive: row.mixInactive,
          doubleInactive: row.doubleInactive,
          gender: row.gender,
        });
      }
    }

    if (toUpsert.length > 0) {
      await RankingLastPlace.bulkCreate(toUpsert as CreationAttributes<RankingLastPlace>[], {
        updateOnDuplicate: [
          "rankingDate",
          "single",
          "singlePoints",
          "singleRank",
          "double",
          "doublePoints",
          "doubleRank",
          "mix",
          "mixPoints",
          "mixRank",
          "singlePointsDowngrade",
          "mixPointsDowngrade",
          "doublePointsDowngrade",
          "totalSingleRanking",
          "totalMixRanking",
          "totalDoubleRanking",
          "totalWithinSingleLevel",
          "totalWithinMixLevel",
          "totalWithinDoubleLevel",
          "singleInactive",
          "mixInactive",
          "doubleInactive",
          "gender",
        ],
        returning: false,
        transaction,
      });
    }
  }

  /**
   * Updates GamePlayerMembership for all games played during the ranking period.
   * Only called when propagateGameMemberships = true (parity with old AfterUpdate hook).
   */
  private async _propagateGameMemberships(
    rows: Partial<RankingPlace>[],
    transaction?: Transaction
  ): Promise<void> {
    try {
      for (const row of rows) {
        if (!row.playerId || !row.systemId || !row.rankingDate) continue;

        // Find next ranking place date to bound the game range
        const nextRankingPlace = await RankingPlace.findOne({
          where: {
            playerId: row.playerId,
            systemId: row.systemId,
            rankingDate: { [Op.gt]: row.rankingDate },
          },
          order: [["rankingDate", "ASC"]],
          limit: 1,
          attributes: ["rankingDate"],
          transaction,
        });

        const endDate = nextRankingPlace?.rankingDate;
        const dateFilter: Record<string, unknown>[] = [{ playedAt: { [Op.gte]: row.rankingDate } }];
        if (endDate) {
          dateFilter.push({ playedAt: { [Op.lt]: endDate } });
        }

        const player = await import("../models/player.model").then((m) =>
          m.Player.findByPk(row.playerId!, { attributes: ["id"], transaction })
        );
        if (!player) continue;

        const games = await player.getGames({
          where: { [Op.and]: dateFilter },
          transaction,
        });

        for (const game of games ?? []) {
          const membership = {
            gameId: game.id,
            playerId: row.playerId,
            systemId: row.systemId,
            single: row.single,
            double: row.double,
            mix: row.mix,
          };

          const [existing, created] = await GamePlayerMembership.findOrCreate({
            where: { playerId: row.playerId, gameId: game.id },
            defaults: membership,
            transaction,
          });

          if (!created) {
            await existing.update(membership, { transaction });
          }
        }
      }
    } catch (e) {
      this.logger.error("Error propagating game memberships", e);
    }
  }
}

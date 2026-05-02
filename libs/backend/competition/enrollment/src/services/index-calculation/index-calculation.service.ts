import {
  EventCompetition,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
} from "@badman/backend-database";
import {
  getBestPlayersFromTeam,
  getIndexFromPlayers,
  IndexPlayer,
} from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { endOfMonth } from "date-fns";
import { Op, Transaction } from "sequelize";
import {
  IndexCalculationContributingPlayer,
  IndexCalculationFailure,
  IndexCalculationInput,
  IndexCalculationResult,
  IndexCalculationSuccess,
} from "./index-calculation.types";

@Injectable()
export class IndexCalculationService {
  private readonly logger = new Logger(IndexCalculationService.name);

  /**
   * Calculate index values for a batch of inputs in a single call.
   * Per-input failures are surfaced as IndexCalculationFailure entries;
   * they do not abort the batch.
   */
  async calculate(
    inputs: IndexCalculationInput[],
    options?: { transaction?: Transaction }
  ): Promise<IndexCalculationResult[]> {
    if (inputs.length === 0) {
      return [];
    }

    // Step 1: Resolve the primary ranking system (shared across all inputs).
    const sys = await this.resolvePrimarySystem(options?.transaction);
    if (!sys) {
      return inputs.map((i) =>
        failure(i.key, "RANKING_SYSTEM_NOT_FOUND", "Primary ranking system not configured.")
      );
    }

    // Step 2: Batch-resolve gender for all players across all inputs.
    const allPlayerIds = [...new Set(inputs.flatMap((i) => i.players.map((p) => p.id)))];
    const { genderMap, notFoundIds } = await this.resolveGenders(allPlayerIds, options?.transaction);

    // Step 3: Batch-fetch RankingPlace rows for inputs that don't specify a sub-event.
    //         Group by season so we issue one DB query per unique season.
    const broadPlaceMaps = await this.fetchBroadPlaceMaps(
      inputs.filter((i) => !i.subEventCompetitionId),
      sys.id,
      options?.transaction
    );

    // Step 4: Process each input.
    const results: IndexCalculationResult[] = [];

    for (const input of inputs) {
      try {
        let placeMap: Map<string, RankingPlace>;

        if (input.subEventCompetitionId) {
          const windowResult = await this.fetchSubEventWindow(
            input.subEventCompetitionId,
            input.players.map((p) => p.id),
            sys.id,
            options?.transaction
          );
          if ("_tag" in windowResult && windowResult._tag === "failure") {
            results.push(windowResult as IndexCalculationFailure);
            continue;
          }
          placeMap = windowResult as Map<string, RankingPlace>;
        } else {
          placeMap = broadPlaceMaps.get(input.season) ?? new Map();
        }

        results.push(
          this.computeResult(input, placeMap, genderMap, notFoundIds, sys.amountOfLevels ?? 12)
        );
      } catch (err) {
        this.logger.error({ key: input.key }, err instanceof Error ? err.stack : String(err));
        results.push(failure(input.key, "INTERNAL_ERROR", "Unexpected error processing input."));
      }
    }

    return results;
  }

  /** Convenience wrapper for single-input callers (e.g., the entry-model hook). */
  async calculateOne(
    input: IndexCalculationInput,
    options?: { transaction?: Transaction }
  ): Promise<IndexCalculationResult> {
    const results = await this.calculate([input], options);
    return results[0];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolvePrimarySystem(transaction?: Transaction): Promise<RankingSystem | null> {
    return RankingSystem.findOne({
      where: { primary: true },
      transaction,
    });
  }

  /** Calendar-year broad window: Jan 1 → Dec 31 of the given season. */
  private buildBroadWindow(season: number): { start: Date; end: Date } {
    const start = new Date(season, 0, 1);
    const end = endOfMonth(new Date(season, 11, 1));
    return { start, end };
  }

  /**
   * Derives the precise snapshot window from an EventCompetition, mirroring
   * the logic in entry.model.ts (recalculateCompetitionIndex).
   */
  private buildPreciseWindow(ec: {
    season: number;
    usedRankingUnit: string;
    usedRankingAmount: number;
  }): { start: Date; end: Date } {
    const refDate = new Date(ec.season, ec.usedRankingAmount, 1);
    // day 0 rolls back to the last day of the previous month (mirrors moment's .set("date", 0))
    const start = new Date(ec.season, ec.usedRankingAmount, 0);
    const end = endOfMonth(refDate);
    return { start, end };
  }

  private async fetchPlaceMap(
    playerIds: string[],
    systemId: string,
    window: { start: Date; end: Date },
    transaction?: Transaction
  ): Promise<Map<string, RankingPlace>> {
    if (playerIds.length === 0) return new Map();

    const rows = await RankingPlace.findAll({
      where: {
        playerId: playerIds,
        systemId,
        rankingDate: { [Op.between]: [window.start, window.end] },
        // updatePossible: true means the row is confirmed/final (not an in-progress
        // recalculation). Only confirmed rows are valid as ranking snapshots.
        updatePossible: true,
      },
      order: [["rankingDate", "DESC"]],
      transaction,
    });

    // Keep most-recent row per player (DESC order gives first hit per player).
    const map = new Map<string, RankingPlace>();
    for (const row of rows) {
      if (row.playerId && !map.has(row.playerId)) {
        map.set(row.playerId, row);
      }
    }
    return map;
  }

  /** Batch-fetch broad place maps, one DB call per unique season. */
  private async fetchBroadPlaceMaps(
    inputs: IndexCalculationInput[],
    systemId: string,
    transaction?: Transaction
  ): Promise<Map<number, Map<string, RankingPlace>>> {
    const bySeasonResult = new Map<number, Map<string, RankingPlace>>();

    const seasonToPlayerIds = new Map<number, string[]>();
    for (const input of inputs) {
      if (!seasonToPlayerIds.has(input.season)) {
        seasonToPlayerIds.set(input.season, []);
      }
      for (const p of input.players) {
        seasonToPlayerIds.get(input.season)!.push(p.id);
      }
    }

    for (const [season, rawIds] of seasonToPlayerIds) {
      const playerIds = [...new Set(rawIds)];
      const window = this.buildBroadWindow(season);
      try {
        bySeasonResult.set(season, await this.fetchPlaceMap(playerIds, systemId, window, transaction));
      } catch (err) {
        this.logger.error({ season, systemId }, err instanceof Error ? err.stack : String(err));
        bySeasonResult.set(season, new Map());
      }
    }

    return bySeasonResult;
  }

  /**
   * Resolves the precise snapshot window for a sub-event and fetches the
   * matching RankingPlace rows. Returns a place map on success or an
   * IndexCalculationFailure on error.
   */
  private async fetchSubEventWindow(
    subEventCompetitionId: string,
    playerIds: string[],
    systemId: string,
    transaction?: Transaction
  ): Promise<Map<string, RankingPlace> | IndexCalculationFailure> {
    const subEvent = await SubEventCompetition.findByPk(subEventCompetitionId, {
      attributes: [],
      include: [
        {
          model: EventCompetition,
          attributes: ["season", "usedRankingUnit", "usedRankingAmount"],
        },
      ],
      transaction,
    });

    if (!subEvent) {
      return failure(subEventCompetitionId, "SUB_EVENT_NOT_FOUND", `SubEventCompetition not found: ${subEventCompetitionId}`);
    }

    const ec = subEvent.eventCompetition;
    if (!ec) {
      return failure(subEventCompetitionId, "SUB_EVENT_NOT_FOUND", `SubEventCompetition ${subEventCompetitionId} has no linked EventCompetition`);
    }

    if (!ec.usedRankingUnit || ec.usedRankingAmount == null) {
      return failure(subEventCompetitionId, "INTERNAL_ERROR", `EventCompetition for sub-event ${subEventCompetitionId} is missing usedRankingUnit / usedRankingAmount`);
    }

    const window = this.buildPreciseWindow({
      season: ec.season,
      usedRankingUnit: ec.usedRankingUnit,
      usedRankingAmount: ec.usedRankingAmount,
    });

    try {
      return await this.fetchPlaceMap(playerIds, systemId, window, transaction);
    } catch (err) {
      this.logger.error({ subEventCompetitionId }, err instanceof Error ? err.stack : String(err));
      return failure(subEventCompetitionId, "RANKING_FETCH_FAILED", `RankingPlace fetch failed for sub-event ${subEventCompetitionId}`);
    }
  }

  /** Batch-resolve player gender from the Player table. */
  private async resolveGenders(
    playerIds: string[],
    transaction?: Transaction
  ): Promise<{ genderMap: Map<string, "M" | "F">; notFoundIds: Set<string> }> {
    const genderMap = new Map<string, "M" | "F">();
    const notFoundIds = new Set<string>();

    if (playerIds.length === 0) return { genderMap, notFoundIds };

    const dbPlayers = await Player.findAll({
      where: { id: playerIds },
      attributes: ["id", "gender"],
      transaction,
    });

    for (const p of dbPlayers) {
      if (p.gender) {
        genderMap.set(p.id, p.gender as "M" | "F");
      }
    }

    for (const id of playerIds) {
      if (!genderMap.has(id)) {
        notFoundIds.add(id);
      }
    }

    return { genderMap, notFoundIds };
  }

  /** Compute a single IndexCalculationResult given pre-fetched data. */
  private computeResult(
    input: IndexCalculationInput,
    placeMap: Map<string, RankingPlace>,
    genderMap: Map<string, "M" | "F">,
    notFoundIds: Set<string>,
    amountOfLevels: number
  ): IndexCalculationResult {
    const missingPlayerIds = input.players
      .filter((p) => !p.gender && notFoundIds.has(p.id))
      .map((p) => p.id);

    if (missingPlayerIds.length > 0) {
      return failure(
        input.key,
        "PLAYER_NOT_FOUND",
        `Players not found: ${missingPlayerIds.join(", ")}`,
        missingPlayerIds
      );
    }

    const resolvedPlayers: IndexCalculationContributingPlayer[] = input.players.map((p) => {
      const place = placeMap.get(p.id);
      const gender = (p.gender ?? genderMap.get(p.id)) as "M" | "F";
      return {
        id: p.id,
        gender,
        single: place?.single ?? amountOfLevels,
        double: place?.double ?? amountOfLevels,
        mix: place?.mix ?? amountOfLevels,
      };
    });

    const indexPlayers: Partial<IndexPlayer>[] = resolvedPlayers.map((p) => ({
      id: p.id,
      gender: p.gender,
      single: p.single,
      double: p.double,
      mix: p.mix,
    }));

    const index = getIndexFromPlayers(input.type, indexPlayers, amountOfLevels);
    const bestResult = getBestPlayersFromTeam(input.type, indexPlayers, amountOfLevels);
    const contributingIds = new Set(bestResult.players.map((p) => p.id));

    const contributingPlayers = resolvedPlayers.filter((p) => contributingIds.has(p.id));
    const missingPlayerCount = Math.max(0, 4 - contributingPlayers.length);

    const successResult: IndexCalculationSuccess = {
      _tag: "success",
      key: input.key,
      index,
      contributingPlayers,
      missingPlayerCount,
      resolvedPlayers,
    };

    return successResult;
  }
}

// ---------------------------------------------------------------------------
// Module-private helper
// ---------------------------------------------------------------------------

function failure(
  key: string,
  code: IndexCalculationFailure["error"]["code"],
  message: string,
  playerIds?: string[]
): IndexCalculationFailure {
  return {
    _tag: "failure",
    key,
    error: {
      code,
      message,
      ...(playerIds ? { playerIds } : {}),
    },
  };
}

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
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import moment from "moment";
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

    // -----------------------------------------------------------------------
    // Step 1: Dedupe and group inputs by (season, rankingSystemId).
    //         One RankingSystem lookup + one RankingPlace.findAll per group.
    // -----------------------------------------------------------------------

    // Gather all unique player IDs across all inputs for the gender batch lookup.
    const allPlayerIds = [...new Set(inputs.flatMap((i) => i.players.map((p) => p.id)))];

    // Batch-load gender for players that don't supply it.
    const playersNeedingGender = inputs.flatMap((i) =>
      i.players.filter((p) => !p.gender).map((p) => p.id)
    );
    const uniqueGenderLookupIds = [...new Set(playersNeedingGender)];

    let genderMap = new Map<string, "M" | "F">();
    let playerNotFoundIds = new Set<string>();

    if (uniqueGenderLookupIds.length > 0) {
      const dbPlayers = await Player.findAll({
        where: { id: uniqueGenderLookupIds },
        attributes: ["id", "gender"],
        transaction: options?.transaction,
      });

      for (const p of dbPlayers) {
        if (p.gender) {
          genderMap.set(p.id, p.gender as "M" | "F");
        }
      }

      // Track which IDs we could not find.
      for (const id of uniqueGenderLookupIds) {
        if (!genderMap.has(id)) {
          playerNotFoundIds.add(id);
        }
      }
    }

    // Group inputs by (season, rankingSystemId).
    type GroupKey = string; // `${season}:${rankingSystemId}`
    const groups = new Map<
      GroupKey,
      {
        season: number;
        rankingSystemId: string;
        inputIndices: number[];
      }
    >();

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const key: GroupKey = `${input.season}:${input.rankingSystemId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          season: input.season,
          rankingSystemId: input.rankingSystemId,
          inputIndices: [],
        });
      }
      groups.get(key)!.inputIndices.push(i);
    }

    // -----------------------------------------------------------------------
    // Step 2: For each group, load RankingSystem and RankingPlace rows.
    // -----------------------------------------------------------------------

    // Map from (rankingSystemId) to RankingSystem row (one per unique systemId).
    const rankingSystemCache = new Map<string, RankingSystem | null>();

    // Map from groupKey to Map<playerId, RankingPlace> (most recent row per player).
    const rankingPlaceCache = new Map<GroupKey, Map<string, RankingPlace>>();

    for (const [groupKey, group] of groups) {
      // 2a. Load RankingSystem (cache by id).
      if (!rankingSystemCache.has(group.rankingSystemId)) {
        const sys = await RankingSystem.findByPk(group.rankingSystemId, {
          transaction: options?.transaction,
        });
        rankingSystemCache.set(group.rankingSystemId, sys);
      }

      const sys = rankingSystemCache.get(group.rankingSystemId);
      if (!sys) {
        // All inputs in this group will fail as RANKING_SYSTEM_NOT_FOUND.
        rankingPlaceCache.set(groupKey, new Map());
        continue;
      }

      // 2b. Collect player IDs for this group.
      const groupPlayerIds = [
        ...new Set(
          group.inputIndices.flatMap((i) => inputs[i].players.map((p) => p.id))
        ),
      ];

      if (groupPlayerIds.length === 0) {
        rankingPlaceCache.set(groupKey, new Map());
        continue;
      }

      // 2c. Determine snapshot window for this group.
      // We use the season and RankingSystem to compute a default window.
      // The per-input subEventCompetitionId (if any) overrides this at the
      // per-input level during Step 3.
      // For the batch fetch, use a broad window [start of season month, end of season+1 month]
      // so we always capture valid rows. Per-input filtering happens in Step 3.
      //
      // NOTE: The canonical per-input snapshot is derived in Step 3; here we
      // just need a broad enough window. Using (season, amountOfLevels) we do
      // a best-effort broad fetch.
      const broadStart = moment().set("year", group.season).set("month", 0).set("date", 1).startOf("day");
      const broadEnd = moment().set("year", group.season).set("month", 11).endOf("month");

      try {
        const rows = await RankingPlace.findAll({
          where: {
            playerId: groupPlayerIds,
            systemId: group.rankingSystemId,
            rankingDate: {
              [Op.between]: [broadStart.toDate(), broadEnd.toDate()],
            },
            updatePossible: true,
          },
          order: [["rankingDate", "DESC"]],
          transaction: options?.transaction,
        });

        // Dedupe: keep the most recent row per player (first due to DESC order).
        const placeMap = new Map<string, RankingPlace>();
        for (const row of rows) {
          if (row.playerId && !placeMap.has(row.playerId)) {
            placeMap.set(row.playerId, row);
          }
        }
        rankingPlaceCache.set(groupKey, placeMap);
      } catch (err) {
        this.logger.error(
          { groupKey, groupPlayerIds },
          err instanceof Error ? err.stack : String(err)
        );
        rankingPlaceCache.set(groupKey, new Map());
        // We'll surface RANKING_FETCH_FAILED per input in Step 3.
      }
    }

    // -----------------------------------------------------------------------
    // Step 3: Process each input, using the cached data.
    // -----------------------------------------------------------------------

    const results: IndexCalculationResult[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const groupKey: GroupKey = `${input.season}:${input.rankingSystemId}`;

      try {
        const sys = rankingSystemCache.get(input.rankingSystemId);
        if (!sys) {
          results.push(
            failure(input.key, "RANKING_SYSTEM_NOT_FOUND", `RankingSystem not found: ${input.rankingSystemId}`)
          );
          continue;
        }

        // Snapshot window resolution (per-input).
        let placeMap = rankingPlaceCache.get(groupKey) ?? new Map<string, RankingPlace>();

        if (input.subEventCompetitionId) {
          // When a sub-event is provided, recompute the snapshot window from EventCompetition.
          const subEvent = await SubEventCompetition.findByPk(input.subEventCompetitionId, {
            attributes: [],
            include: [
              {
                model: EventCompetition,
                attributes: ["season", "usedRankingUnit", "usedRankingAmount"],
              },
            ],
            transaction: options?.transaction,
          });

          if (!subEvent) {
            results.push(
              failure(input.key, "SUB_EVENT_NOT_FOUND", `SubEventCompetition not found: ${input.subEventCompetitionId}`)
            );
            continue;
          }

          if (!subEvent.eventCompetition) {
            results.push(
              failure(input.key, "SUB_EVENT_NOT_FOUND", `SubEventCompetition ${input.subEventCompetitionId} did not include EventCompetition`)
            );
            continue;
          }

          const ec = subEvent.eventCompetition;
          if (!ec.usedRankingUnit || ec.usedRankingAmount == null) {
            results.push(
              failure(input.key, "INTERNAL_ERROR", `EventCompetition ${input.subEventCompetitionId} is missing usedRankingUnit / usedRankingAmount`)
            );
            continue;
          }

          // Mirror entry.model.ts:243-264 exactly.
          const usedRankingDate = moment();
          usedRankingDate.set("year", ec.season);
          usedRankingDate.set(ec.usedRankingUnit as moment.unitOfTime.Base, ec.usedRankingAmount);
          const startRanking = usedRankingDate.clone().set("date", 0);
          const endRanking = usedRankingDate.clone().endOf("month");

          // Re-fetch with the precise window for this input's players.
          const inputPlayerIds = input.players.map((p) => p.id);
          if (inputPlayerIds.length > 0) {
            try {
              const preciseRows = await RankingPlace.findAll({
                where: {
                  playerId: inputPlayerIds,
                  systemId: input.rankingSystemId,
                  rankingDate: {
                    [Op.between]: [startRanking.toDate(), endRanking.toDate()],
                  },
                  updatePossible: true,
                },
                order: [["rankingDate", "DESC"]],
                transaction: options?.transaction,
              });

              placeMap = new Map<string, RankingPlace>();
              for (const row of preciseRows) {
                if (row.playerId && !placeMap.has(row.playerId)) {
                  placeMap.set(row.playerId, row);
                }
              }
            } catch (err) {
              results.push(
                failure(input.key, "RANKING_FETCH_FAILED", `RankingPlace fetch failed for input ${input.key}`)
              );
              continue;
            }
          }
        }

        // Check for not-found players.
        const missingPlayerIds = input.players
          .filter((p) => !p.gender && playerNotFoundIds.has(p.id))
          .map((p) => p.id);

        if (missingPlayerIds.length > 0) {
          results.push(
            failure(
              input.key,
              "PLAYER_NOT_FOUND",
              `Players not found: ${missingPlayerIds.join(", ")}`,
              missingPlayerIds
            )
          );
          continue;
        }

        // Resolve per-player components.
        const amountOfLevels = sys.amountOfLevels ?? 12;

        const resolvedPlayers: IndexCalculationContributingPlayer[] = input.players.map((p) => {
          const place = placeMap.get(p.id);
          const gender = p.gender ?? genderMap.get(p.id) ?? undefined;

          return {
            id: p.id,
            gender: gender as "M" | "F",
            // Caller-supplied value takes precedence over snapshot; snapshot beats default.
            // Mirror entry.model.ts:266-274: -1 sentinel means "use snapshot".
            single: p.single !== undefined
              ? (p.single === -1 ? (place?.single ?? amountOfLevels) : p.single)
              : (place?.single ?? amountOfLevels),
            double: p.double !== undefined
              ? (p.double === -1 ? (place?.double ?? amountOfLevels) : p.double)
              : (place?.double ?? amountOfLevels),
            mix: p.mix !== undefined
              ? (p.mix === -1 ? (place?.mix ?? amountOfLevels) : p.mix)
              : (place?.mix ?? amountOfLevels),
          };
        });

        // Build IndexPlayer array for the canonical helper.
        const indexPlayers: Partial<IndexPlayer>[] = resolvedPlayers.map((p) => ({
          id: p.id,
          gender: p.gender,
          single: p.single,
          double: p.double,
          mix: p.mix,
        }));

        const index = getIndexFromPlayers(input.type, indexPlayers, amountOfLevels);
        const bestResult = getBestPlayersFromTeam(input.type, indexPlayers, amountOfLevels);
        const contributingPlayerIds = new Set(bestResult.players.map((p) => p.id));

        const contributingPlayers: IndexCalculationContributingPlayer[] = resolvedPlayers.filter(
          (p) => contributingPlayerIds.has(p.id)
        );

        const missingPlayerCount = Math.max(0, 4 - contributingPlayers.length);

        const successResult: IndexCalculationSuccess = {
          _tag: "success",
          key: input.key,
          index,
          contributingPlayers,
          missingPlayerCount,
          resolvedPlayers,
        };

        results.push(successResult);
      } catch (err) {
        if (err instanceof NotFoundException) {
          results.push(
            failure(input.key, "INTERNAL_ERROR", err.message)
          );
        } else {
          // Unexpected errors bubble through NestJS pipeline.
          throw err;
        }
      }
    }

    return results;
  }

  /**
   * Convenience wrapper for single-input callers (e.g., the entry-model hook).
   */
  async calculateOne(
    input: IndexCalculationInput,
    options?: { transaction?: Transaction }
  ): Promise<IndexCalculationResult> {
    const results = await this.calculate([input], options);
    return results[0];
  }
}

// ---------------------------------------------------------------------------
// Private helpers
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

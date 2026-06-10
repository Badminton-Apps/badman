import { Player, RankingPlace, RankingSystem, SubEventCompetition } from "@badman/backend-database";
import {
  getBestPlayersFromTeam,
  getIndexFromPlayers,
  IndexPlayer,
  SubEventTypeEnum,
} from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import moment from "moment";
import { QueryTypes, Transaction } from "sequelize";
import {
  IndexCalculationContributingPlayer,
  IndexCalculationFailure,
  IndexCalculationInput,
  IndexCalculationResult,
  IndexCalculationSuccess,
} from "./index-calculation.types";

/**
 * Resolves a team's strength index using the EnrollmentValidationService's
 * canonical rule:
 *
 *   • RankingPlace.rankingDate <= moment([season, 5, 10]).toDate()
 *     (June 10 of season; moment month is 0-indexed)
 *   • ORDER BY rankingDate DESC, keep the first row per player
 *   • No `updatePossible` filter — both confirmed and in-progress rows count,
 *     same as the validator.
 *   • Missing per-discipline values fall back to
 *     `min(single, double, mix) + 2` (validator's "min+2" penalty).
 *     A player with no RankingPlace at all therefore gets
 *     `amountOfLevels + 2` per discipline.
 *
 * `subEventCompetitionId` does NOT influence the cutoff — it is consulted only
 * to derive `type` (M / F / MX / NATIONAL) and/or `season` when the caller
 * does not pass them.
 */
@Injectable()
export class IndexCalculationService {
  private readonly logger = new Logger(IndexCalculationService.name);

  /**
   * Cached primary RankingSystem.
   *
   * Primary system changes only via an admin action (RankingSystemResolver
   * `setPrimary`). In a single process lifetime that is rare, so we cache the
   * row here to spare the index-calc hot path one DB round-trip per call.
   * If the cached row is ever found stale (deleted, no longer `primary`),
   * the in-process cache is invalidated and we re-query.
   */
  private primaryCache: { row: RankingSystem | null; fetchedAt: number } | null = null;
  private static readonly PRIMARY_CACHE_TTL_MS = 5 * 60 * 1000;

  /** Test hook: drop the primary-system cache between cases. */
  resetPrimaryCache(): void {
    this.primaryCache = null;
  }

  private async getPrimarySystem(transaction?: Transaction): Promise<RankingSystem | null> {
    const now = Date.now();
    if (
      this.primaryCache &&
      now - this.primaryCache.fetchedAt < IndexCalculationService.PRIMARY_CACHE_TTL_MS
    ) {
      return this.primaryCache.row;
    }
    const row = await RankingSystem.findOne({
      where: { primary: true },
      transaction,
    });
    this.primaryCache = { row, fetchedAt: now };
    return row;
  }

  /**
   * Calculate index values for a batch of inputs in a single call.
   * Per-input failures are surfaced as IndexCalculationFailure entries;
   * they do not abort the batch.
   *
   * @param options.caller Optional stable identifier for the calling code path.
   *   When provided it is included in every log line as `[<caller>]` and set
   *   as the `index_calc.caller` Sentry span attribute, enabling triage
   *   engineers to attribute slow-calculation warnings without a debugger
   *   (spec FR-008, SC-004).
   */
  async calculate(
    inputs: IndexCalculationInput[],
    options?: { transaction?: Transaction; caller?: string }
  ): Promise<IndexCalculationResult[]> {
    if (inputs.length === 0) {
      return [];
    }

    const start = Date.now();
    const totalPlayers = inputs.reduce((sum, i) => sum + i.players.length, 0);
    return Sentry.startSpan(
      {
        name: "IndexCalculationService.calculate",
        op: "function",
        attributes: {
          "index_calc.input_count": inputs.length,
          "index_calc.player_ref_count": totalPlayers,
        },
      },
      async (span) => {
        try {
          if (options?.caller) {
            span?.setAttribute("index_calc.caller", options.caller);
          }
          return await this._calculate(inputs, options);
        } finally {
          const durationMs = Date.now() - start;
          span?.setAttribute("index_calc.duration_ms", durationMs);
          const callerTag = options?.caller ? ` [${options.caller}]` : "";
          if (durationMs > 1000) {
            this.logger.warn(
              `Slow index calculation:${callerTag} ${inputs.length} input(s), ${totalPlayers} player ref(s), ${durationMs}ms`
            );
          } else {
            this.logger.debug(
              `Index calculation:${callerTag} ${inputs.length} input(s), ${totalPlayers} player ref(s), ${durationMs}ms`
            );
          }
        }
      }
    );
  }

  private async _calculate(
    inputs: IndexCalculationInput[],
    options?: { transaction?: Transaction }
  ): Promise<IndexCalculationResult[]> {
    // Step 1: Derive missing type/season from sub-events (one batched lookup).
    const subEventIds = [
      ...new Set(inputs.map((i) => i.subEventCompetitionId).filter((id): id is string => !!id)),
    ];
    const subEventMap = new Map<string, { eventType: SubEventTypeEnum; season: number }>();
    if (subEventIds.length > 0) {
      try {
        const subEvents = await SubEventCompetition.findAll({
          where: { id: subEventIds },
          attributes: ["id", "eventType"],
          include: [{ association: "eventCompetition", attributes: ["season"] }],
          transaction: options?.transaction,
        });
        for (const se of subEvents) {
          const season = se.eventCompetition?.season;
          if (se.eventType && season != null) {
            subEventMap.set(se.id, { eventType: se.eventType, season });
          }
        }
      } catch (err) {
        this.logger.error({ subEventIds }, err instanceof Error ? err.stack : String(err));
        // Fall through; per-input failure surfaces below.
      }
    }

    // Step 2: Resolve per-input metadata (type, season, systemId).
    interface ResolvedInput {
      input: IndexCalculationInput;
      type: SubEventTypeEnum;
      season: number;
      systemId?: string;
    }
    const resolved: (ResolvedInput | IndexCalculationFailure)[] = inputs.map((input) => {
      let type = input.type;
      let season = input.season;
      if (input.subEventCompetitionId) {
        const se = subEventMap.get(input.subEventCompetitionId);
        if (!se) {
          return failure(
            input.key,
            "SUB_EVENT_NOT_FOUND",
            `SubEventCompetition not found or has no linked EventCompetition: ${input.subEventCompetitionId}`
          );
        }
        type = type ?? se.eventType;
        season = season ?? se.season;
      }
      if (!type || season == null) {
        return failure(
          input.key,
          "MISSING_TYPE_OR_SEASON",
          "Input is missing `type` and/or `season`. Provide them directly or via `subEventCompetitionId`."
        );
      }
      return { input, type, season, systemId: input.systemId };
    });

    // Step 3: Resolve ranking systems (caller-supplied or primary).
    const systemIds = [
      ...new Set(
        resolved
          .filter((r): r is ResolvedInput => !("_tag" in r))
          .map((r) => r.systemId)
          .filter((id): id is string => !!id)
      ),
    ];
    let primarySystem: RankingSystem | null = null;
    const systemById = new Map<string, RankingSystem>();
    try {
      // Always need primary as a fallback for inputs that did not specify a system.
      primarySystem = await this.getPrimarySystem(options?.transaction);
      if (primarySystem) systemById.set(primarySystem.id, primarySystem);

      if (systemIds.length > 0) {
        const explicit = await RankingSystem.findAll({
          where: { id: systemIds },
          transaction: options?.transaction,
        });
        for (const s of explicit) systemById.set(s.id, s);
      }
    } catch (err) {
      this.logger.error(err instanceof Error ? err.stack : String(err));
    }

    // Step 4: Batch-resolve gender for all players across all inputs.
    const allPlayerIds = [...new Set(inputs.flatMap((i) => i.players.map((p) => p.id)))];
    const { genderMap, notFoundIds } = await this.resolveGenders(
      allPlayerIds,
      options?.transaction
    );

    // Step 5: Group RankingPlace fetches by (systemId, season). One DB call per group.
    interface FetchKey {
      systemId: string;
      season: number;
    }
    const fetchKeyOf = (k: FetchKey) => `${k.systemId}::${k.season}`;
    const groups = new Map<string, { key: FetchKey; playerIds: Set<string> }>();
    const inputSystemId = new Map<string, string>(); // input.key -> systemId chosen
    for (const r of resolved) {
      if ("_tag" in r) continue;
      const sys = (r.systemId ? systemById.get(r.systemId) : null) ?? primarySystem;
      if (!sys) continue; // failure handled below
      inputSystemId.set(r.input.key, sys.id);
      const k = fetchKeyOf({ systemId: sys.id, season: r.season });
      const g = groups.get(k);
      if (g) {
        for (const p of r.input.players) g.playerIds.add(p.id);
      } else {
        groups.set(k, {
          key: { systemId: sys.id, season: r.season },
          playerIds: new Set(r.input.players.map((p) => p.id)),
        });
      }
    }
    const placeMaps = new Map<string, Map<string, RankingPlace>>();
    for (const [k, g] of groups) {
      try {
        placeMaps.set(
          k,
          await this.fetchPlaceMap(
            [...g.playerIds],
            g.key.systemId,
            g.key.season,
            options?.transaction
          )
        );
      } catch (err) {
        this.logger.error(
          { systemId: g.key.systemId, season: g.key.season },
          err instanceof Error ? err.stack : String(err)
        );
        placeMaps.set(k, new Map()); // fall through to default-fill
      }
    }

    // Step 6: Process each input.
    const results: IndexCalculationResult[] = [];
    for (const r of resolved) {
      if ("_tag" in r) {
        results.push(r);
        continue;
      }
      const sysId = inputSystemId.get(r.input.key);
      const sys = sysId ? systemById.get(sysId) : null;
      if (!sys) {
        results.push(
          failure(
            r.input.key,
            "RANKING_SYSTEM_NOT_FOUND",
            "No primary ranking system configured and no explicit systemId resolved."
          )
        );
        continue;
      }
      const placeMap =
        placeMaps.get(fetchKeyOf({ systemId: sys.id, season: r.season })) ??
        new Map<string, RankingPlace>();
      try {
        results.push(
          this.computeResult(
            r.input,
            r.type,
            placeMap,
            genderMap,
            notFoundIds,
            sys.amountOfLevels ?? 12
          )
        );
      } catch (err) {
        this.logger.error({ key: r.input.key }, err instanceof Error ? err.stack : String(err));
        results.push(failure(r.input.key, "INTERNAL_ERROR", "Unexpected error processing input."));
      }
    }

    return results;
  }

  /** Convenience wrapper for single-input callers (e.g., the entry-model hook). */
  async calculateOne(
    input: IndexCalculationInput,
    options?: { transaction?: Transaction; caller?: string }
  ): Promise<IndexCalculationResult> {
    const results = await this.calculate([input], options);
    return results[0];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Validator's exact rule: most-recent RankingPlace per player whose
   * `rankingDate` is <= June 10 of `season`.
   */
  private async fetchPlaceMap(
    playerIds: string[],
    systemId: string,
    season: number,
    transaction?: Transaction
  ): Promise<Map<string, RankingPlace>> {
    if (playerIds.length === 0) return new Map();

    const cutoff = moment([season, 5, 10]).toDate();
    const rows = await this._fetchLatestPlacesPerPlayer(playerIds, systemId, cutoff, transaction);

    const map = new Map<string, RankingPlace>();
    for (const row of rows) {
      if (row.playerId) {
        map.set(row.playerId, row as unknown as RankingPlace);
      }
    }
    return map;
  }

  /**
   * Returns one row per player — the most-recent RankingPlace at or before
   * `cutoff` for the given `systemId`. Uses Postgres `DISTINCT ON` and selects
   * only the columns needed for index calculation, avoiding full-history
   * fetches and Sequelize model hydration.
   *
   * Extracted so unit tests can mock the DB boundary without standing up the
   * Sequelize raw-query plumbing.
   */
  protected async _fetchLatestPlacesPerPlayer(
    playerIds: string[],
    systemId: string,
    cutoff: Date,
    transaction?: Transaction
  ): Promise<
    Array<{ playerId: string; single: number | null; double: number | null; mix: number | null }>
  > {
    const sequelize = RankingPlace.sequelize;
    if (!sequelize) {
      throw new Error("RankingPlace.sequelize is not initialized");
    }

    return sequelize.query<{
      playerId: string;
      single: number | null;
      double: number | null;
      mix: number | null;
    }>(
      `SELECT DISTINCT ON ("playerId") "playerId", "single", "double", "mix"
       FROM ranking."RankingPlaces"
       WHERE "systemId" = :systemId
         AND "rankingDate" <= :cutoff
         AND "playerId" IN (:playerIds)
       ORDER BY "playerId", "rankingDate" DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { systemId, cutoff, playerIds },
        transaction,
      }
    );
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

    const foundIds = new Set<string>();
    for (const p of dbPlayers) {
      foundIds.add(p.id);
      if (p.gender) {
        genderMap.set(p.id, p.gender as "M" | "F");
      }
    }

    // Only truly absent players (not in DB at all) are "not found".
    // Players that exist but have no gender are not an error — they are
    // simply absent from genderMap and will contribute without gender
    // filtering (safe for M/F teams; MX will treat them as ungrouped).
    for (const id of playerIds) {
      if (!foundIds.has(id)) {
        notFoundIds.add(id);
      }
    }

    return { genderMap, notFoundIds };
  }

  /**
   * Compute a single IndexCalculationResult given pre-fetched data.
   * Mirrors `EnrollmentValidationService.getPlayers` per-discipline fallback:
   *   bestRankingMin2 = min(s, d, m) + 2  (each component defaults to amountOfLevels first)
   *   missing components default to bestRankingMin2.
   */
  private computeResult(
    input: IndexCalculationInput,
    type: SubEventTypeEnum,
    placeMap: Map<string, RankingPlace>,
    genderMap: Map<string, "M" | "F">,
    notFoundIds: Set<string>,
    amountOfLevels: number
  ): IndexCalculationResult {
    const missingPlayerIds = input.players.filter((p) => notFoundIds.has(p.id)).map((p) => p.id);

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
      const gender = genderMap.get(p.id) as "M" | "F";
      const rawSingle = place?.single;
      const rawDouble = place?.double;
      const rawMix = place?.mix;
      const bestRankingMin2 =
        Math.min(
          rawSingle ?? amountOfLevels,
          rawDouble ?? amountOfLevels,
          rawMix ?? amountOfLevels
        ) + 2;
      return {
        id: p.id,
        gender,
        single: rawSingle ?? bestRankingMin2,
        double: rawDouble ?? bestRankingMin2,
        mix: rawMix ?? bestRankingMin2,
      };
    });

    const indexPlayers: Partial<IndexPlayer>[] = resolvedPlayers.map((p) => ({
      id: p.id,
      // null/undefined gender → omit the key so getBestPlayers excludes this
      // player from MX gender groups (same as getIndexFromPlayers behaviour).
      ...(p.gender ? { gender: p.gender } : {}),
      single: p.single,
      double: p.double,
      mix: p.mix,
    }));

    const index = getIndexFromPlayers(type, indexPlayers, amountOfLevels);
    const bestResult = getBestPlayersFromTeam(type, indexPlayers, amountOfLevels);
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

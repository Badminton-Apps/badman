import { brusselsDayRange, CalendarDate } from "@badman/utils";
import { QueryTypes, Transaction } from "sequelize";
import { RankingPlace } from "../models";

/** The fields of a ranking place that the lookup returns. */
export interface LatestRankingPlace {
  id: string;
  playerId: string;
  rankingDate: Date;
  single: number | null;
  double: number | null;
  mix: number | null;
  updatePossible: boolean;
}

export interface FindLatestRankingPlacesOptions {
  playerIds: string[];
  /** Required: every lookup names its ranking system. */
  systemId: string;
  /** Last publication date to consider, included. */
  onOrBefore: CalendarDate;
  /** First publication date to consider, included. */
  onOrAfter?: CalendarDate;
  /** Only update publications (`updatePossible`), the ones that can change a level. */
  updatePossibleOnly?: boolean;
  transaction?: Transaction;
}

type Row = {
  id: string;
  playerId: string;
  rankingDate: Date | string;
  single: number | null;
  double: number | null;
  mix: number | null;
  updatePossible: boolean | number | null;
};

/**
 * "A player's place at date X for ranking system Y": the newest place per
 * player whose publication date lies in the range, in one query for all players
 * (spec 039, contracts/ranking-lookup.md).
 *
 * Calendar dates become instants with `brusselsDayRange`, so a publication
 * stored at midnight UTC or at midnight Brussels counts for its calendar date.
 * Players without a matching place are absent from the map; callers keep their
 * own fallback. Uses `ROW_NUMBER()`, which Postgres and SQLite (3.25+) support.
 */
export async function findLatestRankingPlaces(
  options: FindLatestRankingPlacesOptions
): Promise<Map<string, LatestRankingPlace>> {
  const { systemId, onOrBefore, onOrAfter, updatePossibleOnly = false, transaction } = options;
  const playerIds = [...new Set(options.playerIds)];
  if (playerIds.length === 0) {
    return new Map();
  }

  const sequelize = RankingPlace.sequelize;
  if (!sequelize) {
    throw new Error("RankingPlace.sequelize is not initialized");
  }

  const { start, endExclusive } = brusselsDayRange({
    from: onOrAfter ?? onOrBefore,
    to: onOrBefore,
  });

  const conditions = [
    `"systemId" = :systemId`,
    `"playerId" IN (:playerIds)`,
    `"rankingDate" < :endExclusive`,
  ];
  if (onOrAfter) {
    conditions.push(`"rankingDate" >= :start`);
  }
  if (updatePossibleOnly) {
    conditions.push(`"updatePossible" = :updatePossible`);
  }

  // Quotes "ranking"."RankingPlaces" on Postgres and `ranking.RankingPlaces` on SQLite.
  const queryGenerator = sequelize.getQueryInterface().queryGenerator as {
    quoteTable(table: ReturnType<typeof RankingPlace.getTableName>): string;
  };
  const table = queryGenerator.quoteTable(RankingPlace.getTableName());
  const rows = await sequelize.query<Row>(
    `SELECT "id", "playerId", "rankingDate", "single", "double", "mix", "updatePossible"
     FROM (
       SELECT "id", "playerId", "rankingDate", "single", "double", "mix", "updatePossible",
              ROW_NUMBER() OVER (PARTITION BY "playerId" ORDER BY "rankingDate" DESC) AS "rowNumber"
       FROM ${table}
       WHERE ${conditions.join(" AND ")}
     ) AS "ranked"
     WHERE "rowNumber" = 1`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        systemId,
        playerIds,
        start: utcTimestamp(start),
        endExclusive: utcTimestamp(endExclusive),
        updatePossible: true,
      },
      transaction,
    }
  );

  return new Map(
    rows.map((row) => [
      row.playerId,
      {
        id: row.id,
        playerId: row.playerId,
        rankingDate: toDate(row.rankingDate),
        single: row.single,
        double: row.double,
        mix: row.mix,
        updatePossible: !!row.updatePossible,
      },
    ])
  );
}

/**
 * A bound as `YYYY-MM-DD HH:mm:ss.SSS +00:00`, the format Sequelize stores dates
 * in on SQLite. Sequelize formats a Date replacement in the process timezone,
 * and SQLite compares the stored text, so a Date would compare wrongly outside
 * UTC. Postgres reads this text as the same instant.
 */
function utcTimestamp(at: Date): string {
  return at.toISOString().replace("T", " ").replace("Z", " +00:00");
}

/** Postgres returns a Date; SQLite returns `YYYY-MM-DD HH:mm:ss.SSS +00:00`. */
function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  const sqlite = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?) ?([+-]\d{2}:\d{2}|Z)?$/.exec(
    value
  );
  return new Date(sqlite ? `${sqlite[1]}T${sqlite[2]}${sqlite[3] ?? "Z"}` : value);
}

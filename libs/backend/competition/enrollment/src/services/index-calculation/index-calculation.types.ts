import { SubEventTypeEnum } from "@badman/utils";

export interface IndexCalculationPlayerInput {
  /** UUID of the player */
  id: string;
  /** Pre-resolved single ranking; when absent the snapshot value (or default) is used */
  single?: number;
  /** Pre-resolved double ranking; when absent the snapshot value (or default) is used */
  double?: number;
  /** Pre-resolved mix ranking; when absent the snapshot value (or default) is used */
  mix?: number;
  /** Gender of the player; when absent it will be resolved from the Player table */
  gender?: "M" | "F";
}

export interface IndexCalculationInput {
  /** Caller-supplied correlation key (typically the team UUID) */
  key: string;
  /** Team type — drives the canonical formula branch (non-MX vs MX) */
  type: SubEventTypeEnum;
  /** Season year */
  season: number;
  /** Ranking system UUID — drives snapshot row selection and amountOfLevels default */
  rankingSystemId: string;
  /**
   * Optional sub-event competition UUID.
   * When present, the service derives season + ranking window from the linked
   * EventCompetition (parity with the entry-model hook).
   * When absent, the service uses (season, rankingSystemId) directly.
   */
  subEventCompetitionId?: string;
  /** Player inputs. Empty array is valid — produces only the missing-player penalty. */
  players: IndexCalculationPlayerInput[];
}

export interface IndexCalculationContributingPlayer {
  id: string;
  gender: "M" | "F";
  /** After default-fill */
  single: number;
  /** After default-fill */
  double: number;
  /** After default-fill */
  mix: number;
}

export interface IndexCalculationSuccess {
  readonly _tag: "success";
  /** Matches the input key for correlation */
  key: string;
  /** Canonical index value (lower = stronger) */
  index: number;
  /** The best-N subset used in the sum */
  contributingPlayers: IndexCalculationContributingPlayer[];
  /** 0..4 — drives the (4-n)*24 / *36 penalty already included in `index` */
  missingPlayerCount: number;
  /**
   * Fully resolved per-player components (including non-contributing players).
   * Used by the entry-model hook to write back to meta.competition.players.
   * @internal Not exposed on the GraphQL surface.
   */
  resolvedPlayers: IndexCalculationContributingPlayer[];
}

export type IndexCalculationErrorCode =
  | "PLAYER_NOT_FOUND"
  | "RANKING_SYSTEM_NOT_FOUND"
  | "SUB_EVENT_NOT_FOUND"
  | "RANKING_FETCH_FAILED"
  | "INTERNAL_ERROR";

export interface IndexCalculationFailure {
  readonly _tag: "failure";
  /** Matches the input key for correlation */
  key: string;
  error: {
    code: IndexCalculationErrorCode;
    message: string;
    /** Populated when code === 'PLAYER_NOT_FOUND' */
    playerIds?: string[];
  };
}

export type IndexCalculationResult = IndexCalculationSuccess | IndexCalculationFailure;

export const isSuccess = (r: IndexCalculationResult): r is IndexCalculationSuccess =>
  r._tag === "success";

export const isFailure = (r: IndexCalculationResult): r is IndexCalculationFailure =>
  r._tag === "failure";

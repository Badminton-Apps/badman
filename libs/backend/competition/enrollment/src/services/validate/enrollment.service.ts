import {
  Club,
  EntryCompetitionPlayer,
  EventCompetition,
  EventEntry,
  Player,
  RankingSystem,
  Standing,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { getSeason } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import {
  EnrollmentOutput,
  EnrollmentValidationData,
  EnrollmentValidationError,
  TeamEnrollmentOutput,
} from "../../models";
import {
  PlayerCompStatusRule,
  PlayerBaseRule,
  PlayerGenderRule,
  PlayerMinLevelRule,
  PlayerSubEventRule,
  Rule,
  TeamBaseIndexRule,
  TeamOrderRule,
  TeamSubeventIndexRule,
  TeamRiserFallerRule,
  TeamSubEventRule,
  TeamMaxBasePlayersRule,
  TeamContinuityRule,
} from "./rules";
import { PartialType, PickType } from "@nestjs/graphql";
import { PlayerClubRule } from "./rules/player-club.rule";
import { TeamBaseGenderRule } from "./rules/team-base-gender.rule";
import { Md5 } from "ts-md5";
import { IndexCalculationService } from "../index-calculation/index-calculation.service";
import {
  IndexCalculationContributingPlayer,
  IndexCalculationInput,
  isFailure,
  isSuccess,
} from "../index-calculation/index-calculation.types";

@Injectable()
export class EnrollmentValidationService {
  private readonly _logger = new Logger(EnrollmentValidationService.name);

  constructor(private readonly indexCalculationService: IndexCalculationService) {}

  async getValidationData({
    clubId,
    systemId,
    teams,
    season,
    loans,
    transfers,
  }: EnrollmentInput): Promise<EnrollmentValidationData> {
    const system = systemId
      ? await RankingSystem.findByPk(systemId)
      : await RankingSystem.findOne({ where: { primary: true } });
    if (!system) {
      throw new Error("No ranking system found");
    }

    const club = clubId ? await Club.findByPk(clubId) : null;
    if (!club) {
      throw new Error(`Club with id ${clubId} not found`);
    }

    season = season ?? getSeason();
    let previousSeasonTeams: Team[] = [];

    if (!teams) {
      throw new Error("No teams found");
    }

    const continuityIds = teams.map((t) => t.link).filter((link) => !!link) as string[];

    if (continuityIds.length > 0) {
      // Continuity lookup: reuse Team.link to locate last season's team entry.
      previousSeasonTeams = await Team.findAll({
        where: {
          link: continuityIds,
          season: season - 1,
        },
        include: [
          {
            model: EventEntry,
            include: [
              { model: Standing },
              {
                model: SubEventCompetition,
                include: [{ model: EventCompetition }],
              },
            ],
          },
        ],
      });
    }

    const stringPlayerIds = [
      ...new Set(
        teams
          .map((t) => t.players)
          .concat(teams.map((t) => t.backupPlayers))
          .concat(teams.map((t) => t.basePlayers))
          .flat(1)
          .filter((p) => !instanceOfEntryCompetitionPlayer(p)) as string[]
      ),
    ];

    // get all players variables that are of type EntryCompetitionPlayer
    const existingPlayers = (
      teams
        .map((t) => t.players)
        .concat(teams.map((t) => t.backupPlayers))
        .concat(teams.map((t) => t.basePlayers))
        .flat(1)
        .filter((p) => instanceOfEntryCompetitionPlayer(p)) as EntryCompetitionPlayer[]
    ).filter((p, index, self) => {
      return index === self.findIndex((e) => e?.id === p?.id);
    });

    const eixistingPlayerIds = [...new Set(existingPlayers.map((p) => p?.id))]?.filter(
      (p) => p !== null && p !== undefined
    ) as string[];

    const [subEvents, dbPlayers, dbPlayersEntry, previousSeasonClubTeams] = await Promise.all([
      SubEventCompetition.findAll({
        where: {
          id: teams.map((e) => e.subEventId)?.filter((e) => !!e) as string[],
        },
        include: [
          {
            model: EventCompetition,
          },
        ],
      }),
      Player.findAll({
        attributes: ["id", "gender", "competitionPlayer", "firstName", "lastName"],
        where: {
          id: stringPlayerIds,
        },
        // RankingPlace lookup is now delegated to IndexCalculationService below.
      }),
      Player.findAll({
        attributes: ["id", "gender", "competitionPlayer", "firstName", "lastName"],
        where: {
          id: eixistingPlayerIds,
        },
      }),
      Team.findAll({
        where: {
          clubId: club.id,
          season: season - 1,
        },
      }),
    ]);

    // Pass 1: build per-team skeletons (player rosters + metadata) without
    // computed indices. Ranks on `EntryCompetitionPlayer` are hydrated in
    // pass 2 from `IndexCalculationService.resolvedPlayers`.
    const skeletons = teams.map((t) => {
      if (!t.type) {
        throw new Error("No type found");
      }
      if (!t.id) {
        throw new Error("No team id found");
      }

      const playersForTeam = this.getPlayers(
        [t.players ?? [], t.backupPlayers ?? [], t.basePlayers ?? []]?.flat(1),
        dbPlayers,
        dbPlayersEntry
      );

      const basePlayers = playersForTeam.filter((p) =>
        t.basePlayers?.map((p) => (instanceOfEntryCompetitionPlayer(p) ? p.id : p)).includes(p.id)
      );

      // find if there are any exceptions requested
      for (const exception of t.exceptions ?? []) {
        const playerIndex = basePlayers.findIndex((p) => p.id === exception);
        if (playerIndex === -1) {
          throw new Error(`Player with id ${exception} not found`);
        }
        basePlayers[playerIndex].levelExceptionRequested = true;
      }

      const teamPlayers = playersForTeam.filter((p) =>
        t.players?.map((p) => (instanceOfEntryCompetitionPlayer(p) ? p.id : p)).includes(p.id)
      );

      const backupPlayers = playersForTeam.filter((p) =>
        t.backupPlayers
          ?.map((p) => (instanceOfEntryCompetitionPlayer(p) ? p.id : p))
          .includes(p.id)
      );

      const previousSeasonTeam = previousSeasonTeams.find((p) => p.link === t.link);
      const missingContinuityId = !t.link;
      const possibleOldTeamTeam = missingContinuityId
        ? previousSeasonClubTeams.find(
            (team) =>
              (team.type === t.type && team.teamNumber === t.teamNumber) ||
              (!!t.name && team.name === t.name)
          )
        : undefined;

      if (missingContinuityId && possibleOldTeamTeam) {
        this._logger.warn(
          `Team continuity id missing for ${t.name ?? t.id}; previous season match exists.`
        );
      }

      return {
        teamId: t.id,
        teamType: t.type,
        team: new Team({
          id: t.id,
          type: t.type,
          name: t.name,
          teamNumber: t.teamNumber,
          link: previousSeasonTeam?.link,
        }),
        previousSeasonTeam,
        possibleOldTeamTeam,
        isNewTeam: !t.link,
        possibleOldTeam: !!possibleOldTeamTeam,
        basePlayers,
        teamPlayers,
        backupPlayers,
        subEvent: subEvents.find((s) => s.id === t.subEventId),
      };
    });

    // Pass 2: single batched call to IndexCalculationService. Per team we
    // submit three inputs:
    //   `${id}:base`   → drives baseIndex AND hydrates basePlayers ranks
    //   `${id}:team`   → drives teamIndex AND hydrates teamPlayers ranks
    //   `${id}:backup` → only hydrates backupPlayers ranks (index discarded)
    // The service deduplicates RankingPlace fetches to one DB query per
    // (systemId, season).
    const indexInputs: IndexCalculationInput[] = [];
    for (const sk of skeletons) {
      const baseIds = sk.basePlayers.map((p) => p.id!).filter((id) => !!id);
      const teamIds = sk.teamPlayers.map((p) => p.id!).filter((id) => !!id);
      const backupIds = sk.backupPlayers.map((p) => p.id!).filter((id) => !!id);
      const common = {
        type: sk.teamType,
        season,
        systemId: system.id,
      };
      indexInputs.push({
        ...common,
        key: `${sk.teamId}:base`,
        players: baseIds.map((id) => ({ id })),
      });
      indexInputs.push({
        ...common,
        key: `${sk.teamId}:team`,
        players: teamIds.map((id) => ({ id })),
      });
      if (backupIds.length > 0) {
        indexInputs.push({
          ...common,
          key: `${sk.teamId}:backup`,
          players: backupIds.map((id) => ({ id })),
        });
      }
    }

    const indexResults =
      indexInputs.length > 0
        ? await this.indexCalculationService.calculate(indexInputs)
        : [];
    const resultsByKey = new Map(indexResults.map((r) => [r.key, r]));

    return {
      club,
      season,
      loans: loans ?? [],
      transfers: transfers ?? [],
      teams: skeletons.map((sk) => {
        const baseRes = resultsByKey.get(`${sk.teamId}:base`);
        const teamRes = resultsByKey.get(`${sk.teamId}:team`);
        const backupRes = resultsByKey.get(`${sk.teamId}:backup`);

        // Hydrate per-player ranks from each respective response. Failures
        // are tolerated: players keep their default-undefined ranks and
        // downstream rules (PlayerGenderRule etc.) surface the underlying
        // issue (missing gender, missing player, …).
        if (baseRes && isSuccess(baseRes)) {
          this.hydrateRanks(sk.basePlayers, baseRes.resolvedPlayers);
        } else if (baseRes && isFailure(baseRes)) {
          this._logger.warn(
            `Index calc failed for team ${sk.teamId} base: ${baseRes.error.code} ${baseRes.error.message}`
          );
        }
        if (teamRes && isSuccess(teamRes)) {
          this.hydrateRanks(sk.teamPlayers, teamRes.resolvedPlayers);
        }
        if (backupRes && isSuccess(backupRes)) {
          this.hydrateRanks(sk.backupPlayers, backupRes.resolvedPlayers);
        }

        const baseIndex = baseRes && isSuccess(baseRes) ? baseRes.index : undefined;
        const teamIndex = teamRes && isSuccess(teamRes) ? teamRes.index : undefined;

        return {
          team: sk.team,
          previousSeasonTeam: sk.previousSeasonTeam,
          possibleOldTeamTeam: sk.possibleOldTeamTeam,
          isNewTeam: sk.isNewTeam,
          possibleOldTeam: sk.possibleOldTeam,
          id: sk.teamId,
          basePlayers: sk.basePlayers,
          teamPlayers: sk.teamPlayers,
          backupPlayers: sk.backupPlayers,
          system,

          baseIndex,
          teamIndex,

          subEvent: sk.subEvent,
        };
      }),
    };
  }

  /**
   * Copy `single` / `double` / `mix` from the index-calculation service's
   * resolved per-player ranks onto the `EntryCompetitionPlayer` objects that
   * downstream rules consume. Idempotent.
   */
  private hydrateRanks(
    players: EntryCompetitionPlayer[],
    resolved: IndexCalculationContributingPlayer[]
  ): void {
    const byId = new Map(resolved.map((r) => [r.id, r]));
    for (const p of players) {
      const r = p.id ? byId.get(p.id) : undefined;
      if (!r) continue;
      p.single = r.single;
      p.double = r.double;
      p.mix = r.mix;
    }
  }

  /**
   * Validate the enrollment
   *
   * @param enrollment Enrollment configuaration
   * @returns Whether the enrollment is valid or not
   */
  async validate(
    enrollment: EnrollmentValidationData,
    validators: Rule[]
  ): Promise<EnrollmentOutput> {
    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(validators.map((v) => v.validate(enrollment)));

    const teams: TeamEnrollmentOutput[] = [];

    for (const team of enrollment.teams) {
      if (!team.team?.id) {
        continue;
      }

      const ruleResults = results?.map((r) => r?.find((t) => t.teamId === team.team?.id));

      const errors =
        ruleResults
          ?.map((r) => r?.errors)
          ?.flat(1)
          ?.filter((e) => !!e) ?? [];
      const warnings =
        ruleResults
          ?.map((r) => r?.warnings)
          ?.flat(1)
          ?.filter((e) => !!e) ?? [];
      const valid = ruleResults?.every((r) => r?.valid);

      const uniqueErrors = errors
        ?.map((r) => ({
          ...r,
          // hash of the error as an id
          id: Md5.hashStr(JSON.stringify(r)),
        }))
        .filter((error, index, self) => {
          return index === self.findIndex((e) => e?.id === error?.id);
        }) as EnrollmentValidationError[];

      const uniqueWarnings = warnings
        ?.map((r) => ({
          ...r,
          // hash of the error as an id
          id: Md5.hashStr(JSON.stringify(r)),
        }))
        .filter((warning, index, self) => {
          return index === self.findIndex((e) => e?.id === warning?.id);
        }) as EnrollmentValidationError[];

      teams.push({
        id: team.team?.id,
        linkId: team.team?.link,
        isNewTeam: team.isNewTeam,
        possibleOldTeam: team.possibleOldTeam,

        teamIndex: team.teamIndex,
        baseIndex: team.baseIndex,
        maxLevel: team.subEvent?.maxLevel,
        minBaseIndex: team.subEvent?.minBaseIndex,
        maxBaseIndex: team.subEvent?.maxBaseIndex,
        errors: uniqueErrors,
        warnings: uniqueWarnings,
        valid,
      });
    }

    return {
      teams,
    };
  }

  async fetchAndValidate(data: EnrollmentInput, validators: Rule[]) {
    const dbData = await this.getValidationData(data);
    return this.validate(dbData, validators);
  }

  static defaultValidators(): Rule[] {
    return [
      new PlayerCompStatusRule(),
      new PlayerBaseRule(),
      new PlayerGenderRule(),
      new PlayerMinLevelRule(),
      new PlayerSubEventRule(),
      new PlayerClubRule(),

      new TeamSubEventRule(),
      new TeamBaseIndexRule(),
      new TeamBaseGenderRule(),
      new TeamMaxBasePlayersRule(),
      new TeamRiserFallerRule(),
      new TeamSubeventIndexRule(),
      new TeamOrderRule(),
      new TeamContinuityRule(),
    ];
  }

  /**
   * Build the per-team `EntryCompetitionPlayer[]` skeleton (id, gender, dbPlayer
   * association) without populating ranks. Ranks are filled later by
   * `hydrateRanks` from `IndexCalculationService.resolvedPlayers`, which is the
   * canonical source for the cutoff + min+2 fallback semantics.
   */
  private getPlayers(
    players: (string | EntryCompetitionPlayer)[],
    withDbPlayer: Player[],
    existingDbPlayers: Player[]
  ): EntryCompetitionPlayer[] {
    const stringPlayerIds = players.filter((p) => !instanceOfEntryCompetitionPlayer(p)) as string[];
    const existingPlayers = players.filter((p) =>
      instanceOfEntryCompetitionPlayer(p)
    ) as EntryCompetitionPlayer[];

    const addedPlayers: EntryCompetitionPlayer[] = [];

    for (const player of existingPlayers) {
      if (!player?.id) continue;
      if (addedPlayers.find((p) => p.id === player.id)) continue;

      const dbPlayer = existingDbPlayers.find((p) => p.id === player.id);
      player.player = dbPlayer;
      addedPlayers.push(player);
    }

    for (const id of stringPlayerIds) {
      if (addedPlayers.find((p) => p.id === id)) continue;

      const dbPlayer = withDbPlayer.find((p) => p.id === id);
      if (!dbPlayer) {
        throw new Error(`Player with id ${id} not found`);
      }

      addedPlayers.push({
        id,
        player: dbPlayer,
        gender: dbPlayer.gender,
        // single / double / mix populated by hydrateRanks
      });
    }

    return addedPlayers;
  }
}

class EnrollmentInput {
  clubId?: string;
  teams?: EnrollmentInputTeam[];
  systemId?: string;
  season?: number;
  loans?: string[];
  transfers?: string[];
}

class EnrollmentInputTeam extends PartialType(
  PickType(Team, ["id", "name", "type", "link", "teamNumber"] as const)
) {
  basePlayers?: (string | EntryCompetitionPlayer)[];
  players?: (string | EntryCompetitionPlayer)[];
  backupPlayers?: (string | EntryCompetitionPlayer)[];
  subEventId?: string | SubEventCompetition;
  exceptions?: string[];
}

const instanceOfEntryCompetitionPlayer = (
  obj: EntryCompetitionPlayer | string | undefined
): obj is EntryCompetitionPlayer => {
  return typeof obj !== "string";
};

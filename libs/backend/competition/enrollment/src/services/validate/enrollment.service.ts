import {
  Club,
  EntryCompetitionPlayer,
  EventCompetition,
  EventEntry,
  Player,
  RankingPlace,
  RankingSystem,
  Standing,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { getCurrentSeason, getIndexFromPlayers } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import {
  EnrollmentOutput,
  EnrollmentValidationData,
  EnrollmentValidationError,
  TeamEnrollmentOutput,
} from '../../models';
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
} from './rules';
import moment from 'moment';
import { Op } from 'sequelize';
import { PartialType, PickType } from '@nestjs/graphql';
import { PlayerClubRule } from './rules/player-club.rule';
import { TeamBaseGenderRule } from './rules/team-base-gender.rule';

@Injectable()
export class EnrollmentValidationService {
  private readonly _logger = new Logger(EnrollmentValidationService.name);

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
      throw new Error('No ranking system found');
    }

    const club = clubId ? await Club.findByPk(clubId) : null;
    if (!club) {
      throw new Error('No club found');
    }

    season = season ?? getCurrentSeason();
    let previousSeasonTeams: Team[] = [];

    if (!teams) {
      throw new Error('No teams found');
    }

    const teamIdIds = teams.map((t) => t.link) as string[];

    if (teamIdIds.length > 0) {
      previousSeasonTeams = await Team.findAll({
        where: {
          link: teamIdIds,
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

    const subEvents = await SubEventCompetition.findAll({
      where: {
        id: teams.map((e) => e.subEventId),
      },
      include: [
        {
          model: EventCompetition,
        },
      ],
    });

    const stringPlayerIds = [
      ...new Set(
        teams
          .map((t) => t.players)
          .concat(teams.map((t) => t.backupPlayers))
          .concat(teams.map((t) => t.basePlayers))
          .flat(1)
          .filter((p) => !instanceOfEntryCompetitionPlayer(p)) as string[],
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
      (p) => p !== null && p !== undefined,
    ) as string[];

    const dbPlayers = await Player.findAll({
      attributes: ['id', 'gender', 'competitionPlayer', 'firstName', 'lastName'],
      where: {
        id: stringPlayerIds,
      },
      include: [
        {
          model: RankingPlace,
          where: {
            systemId: system?.id,
            rankingDate: {
              [Op.lte]: moment([season, 5, 10]).toDate(),
            },
          },
          order: [['rankingDate', 'DESC']],
          limit: 1,
        },
      ],
    });

    const dbPlayersEntry = await Player.findAll({
      attributes: ['id', 'gender', 'competitionPlayer', 'firstName', 'lastName'],
      where: {
        id: eixistingPlayerIds,
      },
    });

    return {
      club,
      season,
      loans: loans ?? [],
      transfers: transfers ?? [],
      teams: teams?.map((t) => {
        if (!t.type) {
          throw new Error('No type found');
        }

        const playersForTeam = this.getPlayers(
          [t.players ?? [], t.backupPlayers ?? [], t.basePlayers ?? []]?.flat(1),
          dbPlayers,
          dbPlayersEntry,
          system,
        );

        const basePlayers = playersForTeam.filter((p) =>
          t.basePlayers
            ?.map((p) => (instanceOfEntryCompetitionPlayer(p) ? p.id : p))
            .includes(p.id),
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
          t.players?.map((p) => (instanceOfEntryCompetitionPlayer(p) ? p.id : p)).includes(p.id),
        );

        const backupPlayers = playersForTeam.filter((p) =>
          t.backupPlayers
            ?.map((p) => (instanceOfEntryCompetitionPlayer(p) ? p.id : p))
            .includes(p.id),
        );

        const teamIndex = getIndexFromPlayers(t.type, teamPlayers);
        const baseIndex = getIndexFromPlayers(t.type, basePlayers);

        const preTeam = previousSeasonTeams.find((p) => p.link === t.link);

        if (!t.id) {
          throw new Error('No team id found');
        }

        return {
          team: new Team({
            id: t.id,
            type: t.type,
            name: t.name,
            teamNumber: t.teamNumber,
            link: preTeam?.link,
          }),
          previousSeasonTeam: preTeam,
          isNewTeam: t.link === null,
          possibleOldTeam: false,
          id: t.id,
          basePlayers,
          teamPlayers,
          backupPlayers,
          system,

          baseIndex,
          teamIndex,

          subEvent: subEvents.find((s) => s.id === t.subEventId),
        };
      }),
    };
  }

  /**
   * Validate the enrollment
   *
   * @param enrollment Enrollment configuaration
   * @returns Whether the enrollment is valid or not
   */
  async validate(
    enrollment: EnrollmentValidationData,
    validators: Rule[],
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

      const uniqueErrors = errors.filter((error, index, self) => {
        return index === self.findIndex((e) => JSON.stringify(e) === JSON.stringify(error));
      }) as EnrollmentValidationError[];

      const uniqueWarnings = warnings.filter((warning, index, self) => {
        return index === self.findIndex((w) => JSON.stringify(w) === JSON.stringify(warning));
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
    ];
  }

  private getPlayers(
    players: (string | EntryCompetitionPlayer)[],
    withRanking: Player[],
    withoutRanking: Player[],
    system?: RankingSystem,
  ): EntryCompetitionPlayer[] {
    if (!system) {
      throw new Error('No ranking system provided');
    }

    const stringPlayerIds = players.filter((p) => !instanceOfEntryCompetitionPlayer(p)) as string[];
    const eixistingPlayerIds = players.filter((p) =>
      instanceOfEntryCompetitionPlayer(p),
    ) as EntryCompetitionPlayer[];

    const addedPlayes: EntryCompetitionPlayer[] = [];

    for (const player of eixistingPlayerIds) {
      if (!player?.id) {
        continue;
      }

      // check if player is already added
      if (addedPlayes.find((p) => p.id === player.id)) {
        continue;
      }

      const dbPlayer = withoutRanking.find((p) => p.id === player?.id);
      player.player = dbPlayer;

      addedPlayes.push(player);
    }

    for (const id of stringPlayerIds) {
      // check if player is already added
      if (addedPlayes.find((p) => p.id === id)) {
        continue;
      }

      const dbPlayer = withRanking.find((p) => p.id === id);
      if (!dbPlayer) {
        throw new Error(`Player with id ${id} not found`);
      }

      const ranking =
        dbPlayer?.rankingPlaces?.[0] ??
        new RankingPlace({
          playerId: dbPlayer.id,
          systemId: system?.id,
        });

      const bestRankingMin2 =
        Math.min(
          ranking?.single ?? system.amountOfLevels,
          ranking?.double ?? system.amountOfLevels,
          ranking?.mix ?? system.amountOfLevels,
        ) + 2;

      // if the player has a missing rankingplace, we set the lowest possible ranking
      ranking.single = ranking?.single ?? bestRankingMin2;
      ranking.double = ranking?.double ?? bestRankingMin2;
      ranking.mix = ranking?.mix ?? bestRankingMin2;

      addedPlayes.push({
        id,
        player: dbPlayer,
        single: ranking.single,
        double: ranking.double,
        mix: ranking.mix,
        gender: dbPlayer.gender,
      });
    }

    return addedPlayes;
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
  PickType(Team, ['id', 'name', 'type', 'link', 'teamNumber'] as const),
) {
  basePlayers?: (string | EntryCompetitionPlayer)[];
  players?: (string | EntryCompetitionPlayer)[];
  backupPlayers?: (string | EntryCompetitionPlayer)[];
  subEventId?: string | SubEventCompetition;
  exceptions?: string[];
}

const instanceOfEntryCompetitionPlayer = (
  obj: EntryCompetitionPlayer | string | undefined,
): obj is EntryCompetitionPlayer => {
  return typeof obj !== 'string';
};

import {
  EventCompetition,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { getIndexFromPlayers } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import {
  EnrollmentInput,
  EnrollmentOutput,
  EnrollmentValidationData,
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
} from './rules';

@Injectable()
export class EnrollmentValidationService {
  private readonly _logger = new Logger(EnrollmentValidationService.name);

  async getValidationData({
    systemId,
    teams,
  }: EnrollmentInput): Promise<EnrollmentValidationData> {
    const system = systemId
      ? await RankingSystem.findByPk(systemId)
      : await RankingSystem.findOne({ where: { primary: true } });
    let previousSeasonTeams = [];

    const teamIdIds = teams.map((t) => t.link);
    if (teamIdIds.length > 0) {
      previousSeasonTeams = await Team.findAll({
        where: {
          id: teamIdIds,
        },
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

    const playerIds = teams
      .map((t) => t.players)
      .concat(teams.map((t) => t.backupPlayers))
      .concat(teams.map((t) => t.basePlayers))
      .flat(1);
    const players = await Player.findAll({
      where: {
        id: playerIds,
      },
      include: [
        {
          model: RankingPlace,
          where: {
            systemId: system?.id,
          },
          order: [['rankingDate', 'DESC']],
          limit: 1,
        },
      ],
    });

    return {
      teams: teams.map((t) => {
        const basePlayers = players.filter((p) =>
          t.basePlayers?.includes(p.id)
        );
        const teamPlayers = players.filter((p) => t.players?.includes(p.id));
        const backupPlayers = players.filter((p) =>
          t.backupPlayers?.includes(p.id)
        );

        const teamIndex = getIndexFromPlayers(
          t.type,
          teamPlayers?.map((p) => ({
            ...p.toJSON(),
            lastRanking: p.rankingLastPlaces?.[0]?.toJSON(),
          }))
        );
        const baseIndex = getIndexFromPlayers(
          t.type,
          basePlayers?.map((p) => ({
            ...p.toJSON(),
            lastRanking: p.rankingLastPlaces?.[0]?.toJSON(),
          }))
        );

        const preTeam = previousSeasonTeams.find((p) => p.linkId === t.link);

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
    validators: Rule[]
  ): Promise<EnrollmentOutput> {
    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(
      validators.map((v) => v.validate(enrollment))
    );

    const teams: TeamEnrollmentOutput[] = [];

    for (const team of enrollment.teams) {
      const ruleResults = results?.map((r) =>
        r?.find((t) => t.teamId === team.team?.id)
      );

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
        errors: errors,
        warnings: warnings,
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
      new PlayerBaseRule(),
      new PlayerCompStatusRule(),
      new PlayerGenderRule(),
      new PlayerMinLevelRule(),
      new PlayerSubEventRule(),

      new TeamBaseIndexRule(),
      new TeamSubeventIndexRule(),
      new TeamOrderRule(),
    ];
  }
}

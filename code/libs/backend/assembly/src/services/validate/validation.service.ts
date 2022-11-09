import {
  EncounterCompetition,
  EventEntry,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
  Team,
} from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op } from 'sequelize';
import { AssemblyData, AssemblyOutput } from '../../models';
import {
  TeamBaseIndexRule,
  CompetitionStatusRule,
  PlayerMinLevelRule,
  PlayerOrderRule,
  Rule,
  TeamSubeventIndexRule,
  PlayerMaxGamesRule,
  PlayerGenderRule,
  TeamClubBaseRule,
} from './rules';

@Injectable()
export class AssemblyValidationService {
  private readonly _logger = new Logger(AssemblyValidationService.name);

  async getValidationData(
    systemId: string,
    teamId: string,
    encounterId: string,

    single1?: string,
    single2?: string,
    single3?: string,
    single4?: string,

    double1?: string[],
    double2?: string[],
    double3?: string[],
    double4?: string[],

    subtitudes?: string[]
  ): Promise<AssemblyData> {
    const idPlayers = [
      single1,
      single2,
      single3,
      single4,
      ...(double1?.flat(1) ?? []),
      ...(double2?.flat(1) ?? []),
      ...(double3?.flat(1) ?? []),
      ...(double4?.flat(1) ?? []),
    ];
    const idSubs = subtitudes;

    const encounter = await EncounterCompetition.findByPk(encounterId);
    const team = await Team.findByPk(teamId, {
      attributes: ['id', 'name', 'type', 'teamNumber', 'clubId'],
    });

    const test = await Team.findAll();

    // Get the event info
    const draw = await encounter.getDrawCompetition({
      attributes: ['id', 'name', 'subeventId'],
    });

    const subEvent = await draw.getSubEventCompetition({
      attributes: ['id', 'eventId', 'minBaseIndex', 'maxBaseIndex', 'maxLevel'],
    });
    const event = await subEvent.getEventCompetition({
      attributes: ['id', 'usedRankingUnit', 'usedRankingAmount', 'startYear'],
    });

    const type = team.type;

    // find all same type team's ids for fetching the etnries
    const clubTeams = await Team.findAll({
      attributes: ['id', 'name'],
      where: {
        clubId: team.clubId,
        type: type,
      },
    });

    // Fetch all the memberships for the same subEvent
    const memberships = await EventEntry.findAll({
      where: {
        teamId: clubTeams?.map((t) => t.id),
        subEventId: subEvent.id,
      },
    });

    const system =
      systemId !== null && systemId !== undefined
        ? await RankingSystem.findByPk(systemId)
        : await RankingSystem.findOne({ where: { primary: true } });

    // Filter out this team's meta
    const meta = memberships?.find((m) => m.teamId == teamId)?.meta;
    // Other teams meta
    const otherMeta = memberships
      ?.filter((m) => m.teamId !== teamId)
      ?.map((m) => m.meta);


    const year = event.startYear;
    const usedRankingDate = moment();
    usedRankingDate.set('year', year);
    usedRankingDate.set(event.usedRankingUnit, event.usedRankingAmount);

    const startRanking = usedRankingDate.clone().set('date', 0);
    const endRanking = usedRankingDate.clone().clone().endOf('month');

    const players = idPlayers
      ? await Player.findAll({
          attributes: [
            'id',
            'firstName',
            'lastName',
            'gender',
            'competitionPlayer',
          ],
          where: {
            id: {
              [Op.in]: idPlayers,
            },
          },
          include: [
            {
              attributes: ['id', 'single', 'double', 'mix'],
              required: false,
              model: RankingLastPlace,
              where: {
                systemId: system.id,
              },
            },
            {
              attributes: ['id', 'single', 'double', 'mix'],
              required: false,
              model: RankingPlace,
              limit: 1,
              where: {
                rankingDate: {
                  [Op.between]: [startRanking.toDate(), endRanking.toDate()],
                },
                systemId: system.id,
              },
            },
          ],
        })
      : [];

    const subs = idSubs
      ? await Player.findAll({
          attributes: ['id', 'firstName', 'lastName', 'gender'],
          where: {
            id: {
              [Op.in]: idSubs,
            },
          },
          include: [
            {
              attributes: ['id', 'single', 'double', 'mix'],
              required: false,
              model: RankingLastPlace,
              where: {
                systemId: system.id,
              },
            },
            {
              attributes: ['id', 'single', 'double', 'mix'],
              required: false,
              model: RankingPlace,
              limit: 1,
              where: {
                rankingDate: {
                  [Op.between]: [startRanking.toDate(), endRanking.toDate()],
                },
                systemId: system.id,
              },
            },
          ],
        })
      : [];

    const baseTeam = Team.baseTeam(players, type);

    return {
      type,
      meta,
      otherMeta,

      teamIndex: baseTeam.index,
      teamPlayers: baseTeam.players,

      encounter,
      draw,
      subEvent,
      event,

      team,

      system,

      single1: players?.find((p) => p.id === single1),
      single2: players?.find((p) => p.id === single2),
      single3: players?.find((p) => p.id === single3),
      single4: players?.find((p) => p.id === single4),

      double1: players?.filter((p) => double1?.flat(1)?.includes(p.id)) as [
        Player,
        Player
      ],
      double2: players?.filter((p) => double2?.flat(1)?.includes(p.id)) as [
        Player,
        Player
      ],
      double3: players?.filter((p) => double3?.flat(1)?.includes(p.id)) as [
        Player,
        Player
      ],
      double4: players?.filter((p) => double4?.flat(1)?.includes(p.id)) as [
        Player,
        Player
      ],

      subtitudes: subs,
    };
  }

  /**
   * Validate the assembly
   *
   * @param assembly Assembly configuaration
   * @returns Whether the assembly is valid or not
   */
  async validate(
    assembly: AssemblyData,
    validators: Rule[]
  ): Promise<AssemblyOutput> {
    // Check all the rules and collect the errors
    const errors = [];
    for (const validator of validators) {
      const result = await validator.validate(assembly);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors,
      };
    }

    return {
      valid: true,
    };
  }

  async fetchAndValidate(
    data: {
      systemId: string;
      teamId: string;
      encounterId: string;

      single1?: string;
      single2?: string;
      single3?: string;
      single4?: string;

      double1?: string[];
      double2?: string[];
      double3?: string[];
      double4?: string[];

      subtitudes?: string[];
    },
    validators: Rule[]
  ) {
    const dbData = await this.getValidationData(
      data.systemId,
      data.teamId,
      data.encounterId,
      data.single1,
      data.single2,
      data.single3,
      data.single4,
      data.double1,
      data.double2,
      data.double3,
      data.double4,
      data.subtitudes
    );
    return this.validate(dbData, validators);
  }

  static defaultValidators(): Rule[] {
    return [
      new PlayerOrderRule(),
      new TeamBaseIndexRule(),
      new TeamClubBaseRule(),
      new TeamSubeventIndexRule(),
      new CompetitionStatusRule(),
      new PlayerMinLevelRule(),
      new PlayerMaxGamesRule(),
      new PlayerGenderRule(),
    ];
  }
}

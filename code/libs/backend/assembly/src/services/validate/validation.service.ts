import {
  EncounterCompetition,
  EventCompetition,
  EventEntry,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
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
    ]?.filter((p) => p !== undefined && p !== null);

    const idSubs = subtitudes?.filter((p) => p !== undefined && p !== null);

    const encounter = await EncounterCompetition.findByPk(encounterId);
    const team = await Team.findByPk(teamId, {
      attributes: ['id', 'name', 'type', 'teamNumber', 'clubId'],
    });

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

    const sameYearSubEvents = await EventCompetition.findAll({
      attributes: ['id'],
      where: {
        startYear: event.startYear,
      },
      include: [
        {
          model: SubEventCompetition,
          attributes: ['id'],
          required: true,
        },
      ],
    });

    const type = team.type;

    // find all same type team's ids for fetching the etnries
    const clubTeams = await Team.findAll({
      attributes: ['id', 'name', 'teamNumber'],
      where: {
        clubId: team.clubId,
        type: type,
      },
    });

    // Fetch all the memberships for the same subEvent
    const memberships = await EventEntry.findAll({
      attributes: ['id', 'teamId', 'subEventId', 'meta'],
      where: {
        teamId: clubTeams?.map((t) => t.id),
        subEventId: sameYearSubEvents
          ?.map((e) => e.subEventCompetitions?.map((s) => s.id))
          .flat(1),
      },
    });

    // filter out entries where the team has a lower or equal teamnumber,
    // or where the subevent is the same as the entry where the team is playing
    const filteredMemberships = memberships?.filter((m) => {
      const t = clubTeams.find((t) => t.id === m.teamId);
      return t.teamNumber <= team.teamNumber || m.subEventId == subEvent.id;
    });

    const system =
      systemId !== null && systemId !== undefined
        ? await RankingSystem.findByPk(systemId)
        : await RankingSystem.findOne({ where: { primary: true } });

    // Filter out this team's meta
    const meta = filteredMemberships?.find((m) => m.teamId == teamId)?.meta;

    // Other teams meta
    const otherMeta = filteredMemberships
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
            'gender',
            'competitionPlayer',
            'memberId',
            'fullName',
            'firstName',
            'lastName',
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
          attributes: [
            'id',
            'gender',
            'memberId',
            'competitionPlayer',
            'fullName',
            'firstName',
            'lastName',
          ],
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

    const titularsTeam = Team.baseTeam(players, type);

    return {
      type,
      meta,
      otherMeta,

      teamIndex: titularsTeam.index,
      teamPlayers: titularsTeam.players,

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
    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(
      validators.map((v) => v.validate(assembly))
    );

    const errors = results
      ?.map((r) => r.errors)
      ?.flat(1)
      ?.filter((e) => !!e);
    const warnings = results
      ?.map((r) => r.warnings)
      ?.flat(1)
      ?.filter((e) => !!e);

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      systemId: assembly.system.id,
      titularsIndex: assembly.teamIndex,
      titularsPlayerData: assembly.teamPlayers,
      baseTeamIndex: assembly.meta?.competition?.teamIndex,
      basePlayersData: assembly.meta?.competition?.players,
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

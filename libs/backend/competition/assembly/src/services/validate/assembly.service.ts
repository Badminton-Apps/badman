import {
  DrawCompetition,
  EncounterCompetition,
  EntryCompetitionPlayer,
  EventCompetition,
  EventEntry,
  MetaEntry,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { ValidationService } from '@badman/backend-validation';
import { getBestPlayers, getBestPlayersFromTeam, SubEventTypeEnum } from '@badman/utils';
import { Logger } from '@nestjs/common';
import moment from 'moment';
import { Op } from 'sequelize';
import { AssemblyOutput, AssemblyValidationData, AssemblyValidationError } from '../../models';
import {
  PlayerCompStatusRule,
  PlayerGenderRule,
  PlayerMaxGamesRule,
  PlayerMinLevelRule,
  PlayerOrderRule,
  TeamBaseIndexRule,
  TeamClubBaseRule,
  TeamSubeventIndexRule,
} from './rules';

export class AssemblyValidationService extends ValidationService<
  AssemblyValidationData,
  AssemblyValidationError<unknown>
> {
  override group = 'team-assembly';

  private readonly _logger = new Logger(AssemblyValidationService.name);
  override async onModuleInit() {
    this._logger.log('Initializing rules');

    await this.clearRules();

    await this.registerRule(PlayerCompStatusRule, PlayerCompStatusRule.description);
    await this.registerRule(TeamBaseIndexRule, TeamBaseIndexRule.description);
    await this.registerRule(TeamSubeventIndexRule, TeamSubeventIndexRule.description);
    await this.registerRule(TeamClubBaseRule, TeamClubBaseRule.description);
    await this.registerRule(PlayerOrderRule, PlayerOrderRule.description);
    await this.registerRule(PlayerMinLevelRule, PlayerMinLevelRule.description);
    await this.registerRule(PlayerMaxGamesRule, PlayerMaxGamesRule.description);
    await this.registerRule(PlayerGenderRule, PlayerGenderRule.description);

    this._logger.log('Rules initialized');
  }
  override async fetchData(args: {
    teamId: string;
    encounterId: string;

    systemId?: string;

    single1?: string;
    single2?: string;
    single3?: string;
    single4?: string;

    double1?: string[];
    double2?: string[];
    double3?: string[];
    double4?: string[];

    subtitudes?: string[];
  }): Promise<AssemblyValidationData> {
    const idPlayers = [
      args.single1,
      args.single2,
      args.single3,
      args.single4,
      ...(args.double1?.flat(1) ?? []),
      ...(args.double2?.flat(1) ?? []),
      ...(args.double3?.flat(1) ?? []),
      ...(args.double4?.flat(1) ?? []),
    ]?.filter((p) => p !== undefined && p !== null) as string[];

    const idSubs = args.subtitudes?.filter((p) => p !== undefined && p !== null);

    const team = await Team.findByPk(args.teamId, {
      attributes: ['id', 'name', 'type', 'teamNumber', 'clubId'],
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const encounter = (await EncounterCompetition.findByPk(args.encounterId)) || undefined;

    let draw: DrawCompetition | null = null;
    let subEvent: SubEventCompetition | null = null;

    if (encounter) {
      draw = await encounter?.getDrawCompetition({
        attributes: ['id', 'name', 'subeventId'],
      });
      subEvent = await draw?.getSubEventCompetition({
        attributes: ['id', 'eventId', 'eventType', 'minBaseIndex', 'maxBaseIndex', 'maxLevel'],
      });
    } else {
      const entry = await team.getEntry();
      draw = await entry?.getDrawCompetition();
      subEvent = await entry?.getSubEventCompetition();
    }

    const event = await subEvent?.getEventCompetition({
      attributes: ['id', 'usedRankingUnit', 'usedRankingAmount', 'season'],
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const sameYearSubEvents = await EventCompetition.findAll({
      attributes: ['id'],
      where: {
        season: event?.season,
      },
      include: [
        {
          model: SubEventCompetition,
          attributes: ['id'],
          required: true,
        },
      ],
    });

    const type = team?.type;

    // find all same type team's ids for fetching the etnries
    const clubTeams = await Team.findAll({
      attributes: ['id', 'name', 'teamNumber'],
      where: {
        clubId: team?.clubId,
        type: type,
        season: event?.season,
      },
    });

    // Fetch all the memberships for the same subEvent
    const memberships = await EventEntry.findAll({
      attributes: ['id', 'teamId', 'subEventId', 'meta'],
      where: {
        teamId: clubTeams?.map((t) => t.id),
        subEventId: sameYearSubEvents
          ?.map((e) => e.subEventCompetitions?.map((s) => s.id))
          .flat(1) as string[],
      },
    });

    // filter out entries where the team has a lower or equal teamnumber,
    // or where the subevent is the same as the entry where the team is playing
    const filteredMemberships = memberships?.filter((m) => {
      const t = clubTeams.find((t) => t.id === m.teamId);
      return (t?.teamNumber ?? 0) <= (team.teamNumber ?? 0) || m.subEventId == subEvent?.id;
    });

    const system =
      args.systemId !== null && args.systemId !== undefined
        ? await RankingSystem.findByPk(args.systemId)
        : await RankingSystem.findOne({ where: { primary: true } });

    if (!system) {
      throw new Error('System not found');
    }

    // Filter out this team's meta
    let meta = filteredMemberships?.find((m) => m.teamId == args.teamId)?.meta;

    // If  meta is found, create a new one
    if (!meta) {
      meta = {};
    }

    if (!meta?.competition) {
      meta.competition = {
        players: [],
      };
    }

    meta.competition.players = getBestPlayers(
      team.type,
      meta.competition.players,
    ) as EntryCompetitionPlayer[];

    // Other teams meta
    const otherMeta = (filteredMemberships
      ?.filter((m) => m.teamId !== args.teamId)
      ?.map((m) => m.meta) ?? []) as MetaEntry[];

    const year = event?.season;
    const usedRankingDate = moment();
    usedRankingDate.set('year', year);
    usedRankingDate.set(event?.usedRankingUnit, event?.usedRankingAmount);

    // get first and last of the month
    const startRanking = moment(usedRankingDate).startOf('month');
    const endRanking = moment(usedRankingDate).endOf('month');
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
              attributes: ['id', 'single', 'double', 'mix', 'rankingDate'],
              required: false,
              model: RankingLastPlace,
              where: {
                systemId: system.id,
              },
            },
            {
              attributes: ['id', 'single', 'double', 'mix', 'rankingDate'],
              required: false,
              model: RankingPlace,
              limit: 1,
              where: {
                rankingDate: {
                  [Op.between]: [startRanking.toDate(), endRanking.toDate()],
                },
                systemId: system.id,
                updatePossible: true,
              },
              order: [['rankingDate', 'DESC']],
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

    const titularsTeam = getBestPlayersFromTeam(
      type,
      players?.map((p) => {
        const rankingPlace = p.rankingPlaces?.[0];
        return {
          id: p.id,
          gender: p.gender,
          single: rankingPlace?.single ?? system.amountOfLevels,
          double: rankingPlace?.double ?? system.amountOfLevels,
          mix: rankingPlace?.mix ?? system.amountOfLevels,
        };
      }),
    );

    // const titularsTeam = Team.baseTeam(players, type);

    return {
      type,
      meta,
      otherMeta,

      teamIndex: titularsTeam.index,
      teamPlayers: (titularsTeam.players?.map((p) => players.find((pl) => pl.id === p.id)) ??
        []) as Player[],

      encounter,
      draw,
      subEvent,
      event,

      team,

      system,

      single1: players?.find((p) => p.id === args.single1),
      single2: players?.find((p) => p.id === args.single2),
      single3: players?.find((p) => p.id === args.single3),
      single4: players?.find((p) => p.id === args.single4),

      double1: players
        ?.filter((p) => args.double1?.flat(1)?.includes(p.id))
        ?.sort(
          (a, b) =>
            (a.rankingLastPlaces?.[0]?.double ?? system.amountOfLevels) -
            (b.rankingLastPlaces?.[0]?.double ?? system.amountOfLevels),
        ) as [Player, Player],
      double2: players
        ?.filter((p) => args.double2?.flat(1)?.includes(p.id))
        ?.sort(
          (a, b) =>
            (a.rankingLastPlaces?.[0]?.double ?? system.amountOfLevels) -
            (b.rankingLastPlaces?.[0]?.double ?? system.amountOfLevels),
        ) as [Player, Player],
      double3: players
        ?.filter((p) => args.double3?.flat(1)?.includes(p.id))
        ?.sort((a, b) => {
          const ranking = type === SubEventTypeEnum.MX ? 'mix' : 'double';
          return (
            (a.rankingLastPlaces?.[0]?.[ranking] ?? system.amountOfLevels) -
            (b.rankingLastPlaces?.[0]?.[ranking] ?? system.amountOfLevels)
          );
        }) as [Player, Player],
      double4: players
        ?.filter((p) => args.double4?.flat(1)?.includes(p.id))
        ?.sort((a, b) => {
          const ranking = type === SubEventTypeEnum.MX ? 'mix' : 'double';
          return (
            (a.rankingLastPlaces?.[0]?.[ranking] ?? system.amountOfLevels) -
            (b.rankingLastPlaces?.[0]?.[ranking] ?? system.amountOfLevels)
          );
        }) as [Player, Player],

      subtitudes: subs,
    };
  }


  /**
   * Validate the assembly
   *
   * @param assembly Assembly configuaration
   * @returns Whether the assembly is valid or not
   */
  override async validate(
    args: {
      teamId: string;
      encounterId: string;

      systemId?: string;

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
    runFor?: {
      playerId?: string;
      teamId?: string;
      clubId?: string;
    },
  ) {
    const team = await Team.findByPk(args.teamId, {
      attributes: ['clubId'],
    });
    const data = await super.validate(args, {
      ...runFor,
      teamId: args.teamId,
      clubId: team?.clubId,
    });

    return {
      valid: data.valid,
      errors: data.errors,
      warnings: data.warnings,
      systemId: data.system?.id,
      titularsIndex: data.teamIndex,
      titularsPlayerData: data.teamPlayers,
      baseTeamIndex: data.meta?.competition?.teamIndex,
      basePlayersData: data.meta?.competition?.players,
    } as AssemblyOutput;
  }
}

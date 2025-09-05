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
  Standing,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { ValidationService } from "@badman/backend-validation";
import { getBestPlayers, getBestPlayersFromTeam, SubEventTypeEnum, IsUUID } from "@badman/utils";
import { Logger } from "@nestjs/common";
import moment from "moment";
import { Op } from "sequelize";
import { AssemblyOutput, AssemblyValidationData, AssemblyValidationError } from "../../models";
import {
  PlayerCompStatusRule,
  PlayerGenderRule,
  PlayerMaxGamesRule,
  PlayerMinLevelRule,
  PlayerOrderRule,
  TeamBaseIndexRule,
  TeamClubBaseRule,
  TeamSubeventIndexRule,
} from "./rules";

export class AssemblyValidationService extends ValidationService<
  AssemblyValidationData,
  AssemblyValidationError<unknown>
> {
  override group = "team-assembly";

  private readonly _logger = new Logger(AssemblyValidationService.name);
  override async onApplicationBootstrap() {
    this._logger.log("Initializing rules");

    await this.clearRules();

    await this.registerRule(PlayerCompStatusRule);
    await this.registerRule(TeamBaseIndexRule);
    await this.registerRule(TeamSubeventIndexRule);
    await this.registerRule(TeamClubBaseRule);
    await this.registerRule(PlayerOrderRule);
    await this.registerRule(PlayerMinLevelRule);
    await this.registerRule(PlayerMaxGamesRule);
    await this.registerRule(PlayerGenderRule);

    this._logger.log("Rules initialized");
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

    // Parallelize initial data fetching
    const [team, encounter, system] = await Promise.all([
      IsUUID(args.teamId)
        ? Team.findByPk(args.teamId, {
            attributes: ["id", "name", "type", "teamNumber", "clubId", "link", "season"],
          })
        : Team.findOne({
            where: { slug: args.teamId },
            attributes: ["id", "name", "type", "teamNumber", "clubId", "link", "season"],
          }),
      EncounterCompetition.findByPk(args.encounterId),
      args.systemId !== null && args.systemId !== undefined
        ? RankingSystem.findByPk(args.systemId)
        : RankingSystem.findOne({ where: { primary: true } }),
    ]);

    if (!team?.season) {
      throw new Error("Team not found");
    }
    if (!system) {
      throw new Error("System not found");
    }

    // Parallelize secondary data fetching
    const [previousSeasonTeam, drawAndSubEvent] = await Promise.all([
      Team.findOne({
        attributes: ["id"],
        where: { link: team.link, season: team.season - 1 },
        include: [
          {
            attributes: ["id"],
            model: EventEntry,
            include: [{ attributes: ["id", "faller"], model: Standing }],
          },
        ],
      }),
      this.getDrawAndSubEvent(encounter || undefined, team),
    ]);

    const { draw, subEvent } = drawAndSubEvent;

    if (!subEvent) {
      throw new Error("SubEvent not found");
    }

    const event = await subEvent.getEventCompetition({
      attributes: ["id", "usedRankingUnit", "usedRankingAmount", "season"],
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.usedRankingUnit || !event.usedRankingAmount) {
      throw new Error("EventCompetition usedRankingUnit is not set");
    }

    // Parallelize complex data fetching
    const [sameYearSubEvents, clubTeams] = await Promise.all([
      EventCompetition.findAll({
        attributes: ["id"],
        where: { season: event.season },
        include: [
          {
            model: SubEventCompetition,
            attributes: ["id"],
            required: true,
          },
        ],
      }),
      Team.findAll({
        attributes: ["id", "name", "teamNumber"],
        where: {
          clubId: team.clubId,
          type: team.type,
          season: event.season,
        },
      }),
    ]);

    // Get memberships
    const memberships = await EventEntry.findAll({
      attributes: ["id", "teamId", "subEventId", "meta"],
      where: {
        teamId: clubTeams.map((t) => t.id),
        subEventId: sameYearSubEvents
          .map((e) => e.subEventCompetitions?.map((s) => s.id))
          .flat(1) as string[],
      },
    });

    // Filter memberships
    const filteredMemberships = memberships.filter((m) => {
      const t = clubTeams.find((t) => t.id === m.teamId);
      return (t?.teamNumber ?? 0) <= (team.teamNumber ?? 0) || m.subEventId == subEvent.id;
    });

    // Process meta data
    let meta = filteredMemberships.find((m) => m.teamId == args.teamId)?.meta;
    if (!meta) {
      meta = {};
    }
    if (!meta?.competition) {
      meta.competition = { players: [] };
    }

    meta.competition.players = getBestPlayers(
      team.type,
      meta.competition.players
    ) as EntryCompetitionPlayer[];

    const otherMeta = (filteredMemberships
      .filter((m) => m.teamId !== args.teamId)
      .map((m) => m.meta) ?? []) as MetaEntry[];

    // Calculate ranking dates
    const year = event.season;
    const usedRankingDate = moment();
    usedRankingDate.set("year", year);
    usedRankingDate.set(event.usedRankingUnit, event.usedRankingAmount);

    const startRanking = moment(usedRankingDate).startOf("month");
    const endRanking = moment(usedRankingDate).endOf("month");

    // Parallelize player data fetching
    const [players, subs] = await Promise.all([
      idPlayers.length > 0
        ? this.fetchPlayersWithRankings(idPlayers, system, startRanking, endRanking)
        : Promise.resolve([]),
      idSubs && idSubs.length > 0
        ? this.fetchSubstitutePlayers(idSubs, system, startRanking, endRanking)
        : Promise.resolve([]),
    ]);

    // Calculate team index
    const titularsTeam = getBestPlayersFromTeam(
      team.type,
      players.map((p) => {
        const rankingPlace = p.rankingPlaces?.[0];
        return {
          id: p.id,
          gender: p.gender,
          single: rankingPlace?.single ?? system.amountOfLevels,
          double: rankingPlace?.double ?? system.amountOfLevels,
          mix: rankingPlace?.mix ?? system.amountOfLevels,
        };
      })
    );

    return {
      type: team.type,
      meta,
      otherMeta,
      teamIndex: titularsTeam.index,
      teamPlayers: (titularsTeam.players?.map((p) => players.find((pl) => pl.id === p.id)) ??
        []) as Player[],
      encounter: encounter || undefined,
      draw: draw || undefined,
      subEvent,
      event,
      team,
      previousSeasonTeam,
      system,
      single1: players.find((p) => p.id === args.single1),
      single2: players.find((p) => p.id === args.single2),
      single3: players.find((p) => p.id === args.single3),
      single4: players.find((p) => p.id === args.single4),
      double1: this.sortPlayersByRanking(
        players.filter((p) => args.double1?.flat(1)?.includes(p.id)),
        system,
        "double"
      ) as [Player, Player],
      double2: this.sortPlayersByRanking(
        players.filter((p) => args.double2?.flat(1)?.includes(p.id)),
        system,
        "double"
      ) as [Player, Player],
      double3: this.sortPlayersByRanking(
        players.filter((p) => args.double3?.flat(1)?.includes(p.id)),
        system,
        team.type === SubEventTypeEnum.MX ? "mix" : "double"
      ) as [Player, Player],
      double4: this.sortPlayersByRanking(
        players.filter((p) => args.double4?.flat(1)?.includes(p.id)),
        system,
        team.type === SubEventTypeEnum.MX ? "mix" : "double"
      ) as [Player, Player],
      subtitudes: subs,
    };
  }

  private async getDrawAndSubEvent(
    encounter: EncounterCompetition | undefined,
    team: Team
  ): Promise<{ draw: DrawCompetition | null; subEvent: SubEventCompetition | null }> {
    let draw: DrawCompetition | null = null;
    let subEvent: SubEventCompetition | null = null;

    if (encounter) {
      draw = await encounter.getDrawCompetition({
        attributes: ["id", "name", "subeventId"],
      });
      subEvent = await draw?.getSubEventCompetition({
        attributes: ["id", "eventId", "eventType", "minBaseIndex", "maxBaseIndex", "maxLevel"],
      });
    } else {
      const entry = await team.getEntry();
      draw = await entry?.getDrawCompetition();
      subEvent = await entry?.getSubEventCompetition();
    }

    return { draw, subEvent };
  }

  private async fetchPlayersWithRankings(
    idPlayers: string[],
    system: RankingSystem,
    startRanking: moment.Moment,
    endRanking: moment.Moment
  ): Promise<Player[]> {
    return Player.findAll({
      attributes: [
        "id",
        "gender",
        "competitionPlayer",
        "memberId",
        "fullName",
        "firstName",
        "lastName",
      ],
      where: { id: { [Op.in]: idPlayers } },
      include: [
        {
          attributes: ["id", "single", "double", "mix", "rankingDate"],
          required: false,
          model: RankingLastPlace,
          where: { systemId: system.id },
        },
        {
          attributes: ["id", "single", "double", "mix", "rankingDate"],
          required: false,
          model: RankingPlace,
          limit: 1,
          where: {
            rankingDate: { [Op.between]: [startRanking.toDate(), endRanking.toDate()] },
            systemId: system.id,
            updatePossible: true,
          },
          order: [["rankingDate", "DESC"]],
        },
      ],
    });
  }

  private async fetchSubstitutePlayers(
    idSubs: string[],
    system: RankingSystem,
    startRanking: moment.Moment,
    endRanking: moment.Moment
  ): Promise<Player[]> {
    return Player.findAll({
      attributes: [
        "id",
        "gender",
        "memberId",
        "competitionPlayer",
        "fullName",
        "firstName",
        "lastName",
      ],
      where: { id: { [Op.in]: idSubs } },
      include: [
        {
          attributes: ["id", "single", "double", "mix"],
          required: false,
          model: RankingLastPlace,
          where: { systemId: system.id },
        },
        {
          attributes: ["id", "single", "double", "mix"],
          required: false,
          model: RankingPlace,
          limit: 1,
          where: {
            rankingDate: { [Op.between]: [startRanking.toDate(), endRanking.toDate()] },
            systemId: system.id,
          },
        },
      ],
    });
  }

  private sortPlayersByRanking(
    players: Player[],
    system: RankingSystem,
    rankingType: "single" | "double" | "mix"
  ): Player[] {
    return players.sort((a, b) => {
      const rankingA = a.rankingLastPlaces?.[0]?.[rankingType] ?? system.amountOfLevels;
      const rankingB = b.rankingLastPlaces?.[0]?.[rankingType] ?? system.amountOfLevels;
      return rankingA - rankingB;
    });
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
    }
  ) {
    const data = await super.validate(args, {
      ...runFor,
      teamId: args.teamId,
    });

    return {
      valid: data.valid,
      errors: data.errors,
      warnings: data.warnings,
      validators: data.validators,
      systemId: data.system?.id,
      titularsIndex: data.teamIndex,
      titularsPlayerData: data.teamPlayers,
      baseTeamIndex: data.meta?.competition?.teamIndex,
      basePlayersData: data.meta?.competition?.players,
    } as AssemblyOutput;
  }
}

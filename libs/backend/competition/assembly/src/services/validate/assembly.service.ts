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

  // OPTIMIZATION: Simple player cache to avoid refetching same players
  private playerCache = new Map<string, Player>();

  // OPTIMIZATION: Cache for heavy database queries
  private clubTeamsCache = new Map<string, { teams: Team[]; timestamp: number }>();
  private seasonSubEventsCache = new Map<
    string,
    { subEvents: EventCompetition[]; timestamp: number }
  >();
  private membershipCache = new Map<string, { memberships: EventEntry[]; timestamp: number }>();

  private readonly DATA_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for more stable data
  override async onApplicationBootstrap() {
    this._logger.log("Initializing rules");

    await this.clearRules();

    // Set up simple cache cleanup every 10 minutes
    setInterval(
      () => {
        this.cleanupPlayerCaches();
      },
      10 * 60 * 1000
    );

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

  /**
   * OPTIMIZATION: Simple cache cleanup
   */
  private cleanupPlayerCaches(): void {
    const now = Date.now();

    // Clean up expired data caches
    for (const [key, entry] of this.clubTeamsCache.entries()) {
      if (now - entry.timestamp > this.DATA_CACHE_TTL) {
        this.clubTeamsCache.delete(key);
      }
    }
    for (const [key, entry] of this.seasonSubEventsCache.entries()) {
      if (now - entry.timestamp > this.DATA_CACHE_TTL) {
        this.seasonSubEventsCache.delete(key);
      }
    }
    for (const [key, entry] of this.membershipCache.entries()) {
      if (now - entry.timestamp > this.DATA_CACHE_TTL) {
        this.membershipCache.delete(key);
      }
    }

    // Keep player cache size reasonable (max 200 players)
    if (this.playerCache.size > 200) {
      const entries = Array.from(this.playerCache.entries());
      this.playerCache.clear();
      // Keep last 100 entries
      entries.slice(-100).forEach(([key, player]) => {
        this.playerCache.set(key, player);
      });
      this._logger.debug(`🧹 [CACHE] Cleaned up player cache, kept 100 most recent players`);
    }

    // Keep data caches reasonable size
    if (this.clubTeamsCache.size > 20) {
      const entries = Array.from(this.clubTeamsCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.clubTeamsCache.clear();
      entries.slice(0, 10).forEach(([key, entry]) => {
        this.clubTeamsCache.set(key, entry);
      });
      this._logger.debug(`🧹 [CACHE] Cleaned up club teams cache, kept 10 most recent entries`);
    }

    if (this.seasonSubEventsCache.size > 20) {
      const entries = Array.from(this.seasonSubEventsCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.seasonSubEventsCache.clear();
      entries.slice(0, 10).forEach(([key, entry]) => {
        this.seasonSubEventsCache.set(key, entry);
      });
      this._logger.debug(
        `🧹 [CACHE] Cleaned up season subevents cache, kept 10 most recent entries`
      );
    }

    if (this.membershipCache.size > 20) {
      const entries = Array.from(this.membershipCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.membershipCache.clear();
      entries.slice(0, 10).forEach(([key, entry]) => {
        this.membershipCache.set(key, entry);
      });
      this._logger.debug(`🧹 [CACHE] Cleaned up memberships cache, kept 10 most recent entries`);
    }
  }

  /**
   * OPTIMIZATION: Get player with simple caching
   */
  private async getPlayerWithCache(
    playerId: string,
    system: RankingSystem,
    startRanking: moment.Moment,
    endRanking: moment.Moment
  ): Promise<Player | null> {
    // Check cache first
    if (this.playerCache.has(playerId)) {
      return this.playerCache.get(playerId)!;
    }

    // Fetch from database
    const player = await Player.findByPk(playerId, {
      attributes: [
        "id",
        "gender",
        "competitionPlayer",
        "memberId",
        "fullName",
        "firstName",
        "lastName",
      ],
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
            updatePossible: true,
          },
          order: [["rankingDate", "DESC"]],
          separate: true,
        },
      ],
    });

    if (player) {
      // Cache the player
      this.playerCache.set(playerId, player);
    }

    return player;
  }

  /**
   * OPTIMIZATION: Get club teams with caching
   */
  private async getClubTeamsWithCache(
    clubId: string,
    type: string,
    season: number
  ): Promise<Team[]> {
    const cacheKey = `${clubId}-${type}-${season}`;
    const cached = this.clubTeamsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.DATA_CACHE_TTL) {
      return cached.teams;
    }

    const teams = await Team.findAll({
      attributes: ["id", "name", "teamNumber"],
      where: { clubId, type, season },
    });

    this.clubTeamsCache.set(cacheKey, {
      teams,
      timestamp: Date.now(),
    });

    return teams;
  }

  /**
   * OPTIMIZATION: Get season subevents with caching
   */
  private async getSeasonSubEventsWithCache(season: number): Promise<EventCompetition[]> {
    const cacheKey = `season-${season}`;
    const cached = this.seasonSubEventsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.DATA_CACHE_TTL) {
      return cached.subEvents;
    }

    const subEvents = await EventCompetition.findAll({
      attributes: ["id"],
      where: { season },
      include: [
        {
          model: SubEventCompetition,
          attributes: ["id"],
          required: true,
        },
      ],
    });

    this.seasonSubEventsCache.set(cacheKey, {
      subEvents,
      timestamp: Date.now(),
    });

    return subEvents;
  }

  /**
   * OPTIMIZATION: Get memberships with caching
   */
  private async getMembershipsWithCache(
    clubId: string,
    season: number,
    type: string,
    subEventIds: string[]
  ): Promise<EventEntry[]> {
    const cacheKey = `${clubId}-${season}-${type}`;
    const cached = this.membershipCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.DATA_CACHE_TTL) {
      return cached.memberships;
    }

    // Get club teams first (using cache)
    const clubTeams = await this.getClubTeamsWithCache(clubId, type, season);

    const memberships = await EventEntry.findAll({
      attributes: ["id", "teamId", "subEventId", "meta"],
      where: {
        teamId: clubTeams.map((t) => t.id),
        subEventId: subEventIds,
      },
    });

    this.membershipCache.set(cacheKey, {
      memberships,
      timestamp: Date.now(),
    });

    return memberships;
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
    console.log("FETCH DATA FOR ASSEMBLY:", args);
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

    if (!team?.season || !team.clubId || !team.type) {
      throw new Error("Team not found or missing required fields");
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

    // Parallelize complex data fetching with caching
    const [sameYearSubEvents, clubTeams] = await Promise.all([
      this.getSeasonSubEventsWithCache(event.season),
      this.getClubTeamsWithCache(team.clubId, team.type, event.season),
    ]);

    // Get memberships with caching
    const subEventIds = sameYearSubEvents
      .map((e) => e.subEventCompetitions?.map((s) => s.id))
      .flat(1) as string[];

    const memberships = await this.getMembershipsWithCache(
      team.clubId,
      event.season,
      team.type,
      subEventIds
    );

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
        console.log("PLAYER:", p, p.id);
        console.table(p.toJSON());
        const rankingPlace = p.rankingPlaces?.[0];
        const rankingLastPlace = p.rankingLastPlaces?.[0];

        console.log("RANKING PLACE:", rankingPlace);
        console.log("RANKING LAST PLACE:", rankingLastPlace);

        const ranking = rankingLastPlace ?? rankingPlace;
        console.log("RANKING:", ranking);
        console.log("Ranking single:", ranking?.single);
        console.log("Ranking double:", ranking?.double);
        console.log("Ranking mix:", ranking?.mix);
        const data = {
          id: p.id,
          gender: p.gender,
          single: ranking?.single ?? system.amountOfLevels,
          double: ranking?.double ?? system.amountOfLevels,
          mix: ranking?.mix ?? system.amountOfLevels,
        };

        console.log("DATA:", data);
        return data;
      })
    );

    console.log("TITULARS TEAM:", titularsTeam);
    console.log(titularsTeam.players);

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

  /**
   * OPTIMIZATION: Fetch players with simple caching
   */
  private async fetchPlayersWithRankings(
    idPlayers: string[],
    system: RankingSystem,
    startRanking: moment.Moment,
    endRanking: moment.Moment
  ): Promise<Player[]> {
    if (!idPlayers || idPlayers.length === 0) {
      return [];
    }

    const results: Player[] = [];
    const uniquePlayerIds = [...new Set(idPlayers)]; // BUGFIX: Remove duplicates from input

    // Check cache first, then fetch missing players
    for (const playerId of uniquePlayerIds) {
      const player = await this.getPlayerWithCache(playerId, system, startRanking, endRanking);
      if (player) {
        results.push(player);
      }
    }

    return results;
  }

  /**
   * OPTIMIZATION: Fetch substitute players with simple caching
   */
  private async fetchSubstitutePlayers(
    idSubs: string[],
    system: RankingSystem,
    startRanking: moment.Moment,
    endRanking: moment.Moment
  ): Promise<Player[]> {
    if (!idSubs || idSubs.length === 0) {
      return [];
    }

    const results: Player[] = [];
    const uniquePlayerIds = [...new Set(idSubs)]; // BUGFIX: Remove duplicates from input

    // Use same caching as main players
    for (const playerId of uniquePlayerIds) {
      const player = await this.getPlayerWithCache(playerId, system, startRanking, endRanking);
      if (player) {
        results.push(player);
      }
    }

    return results;
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
   * Log current cache memory usage
   */
  private logCacheMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalCacheSize =
      this.playerCache.size +
      this.clubTeamsCache.size +
      this.seasonSubEventsCache.size +
      this.membershipCache.size;
    this._logger.debug(
      `🧠 [CACHE] Memory - Heap: ${heapUsedMB}MB, Caches: ${this.playerCache.size}p + ${this.clubTeamsCache.size}c + ${this.seasonSubEventsCache.size}s + ${this.membershipCache.size}m = ${totalCacheSize} total`
    );
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

    // Log cache memory usage after each validation
    this.logCacheMemoryUsage();

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

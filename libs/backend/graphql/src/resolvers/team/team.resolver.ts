import { User } from "@badman/backend-authorization";
import {
  Club,
  EntryCompetitionPlayer,
  EntryCompetitionPlayersInputType,
  EventEntry,
  Location,
  Player,
  PlayerWithTeamMembershipType,
  Team,
  TeamNewInput,
  TeamPlayerMembership,
  TeamUpdateInput,
  TeamWithPlayerMembershipType,
} from "@badman/backend-database";
import {
  IndexCalculationInput,
  IndexCalculationService,
  IndexCalculationSuccess,
  isFailure,
} from "@badman/backend-enrollment";
import { IsUUID, SubEventTypeEnum, TeamMembershipType } from "@badman/utils";
import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode, ListArgs } from "../../utils";
import { TeamAssociationService } from "./team-association.service";
import { TeamResult } from "./team-result.object";

@Resolver(() => Team)
export class TeamsResolver {
  private readonly logger = new Logger(TeamsResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private readonly indexCalculationService: IndexCalculationService,
    private readonly teamAssociationService: TeamAssociationService
  ) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Logs and throws a GraphQLError for an index-calculation failure. Return type `never` — always throws. */
  private indexFailureToGraphQLError(
    result: { error: { code: string; message: string; playerIds?: string[] } },
    context: { clubId?: string | null; userId?: string | null }
  ): never {
    this.logger.warn({ code: result.error.code, ...context }, result.error.message);
    const code =
      result.error.code === "PLAYER_NOT_FOUND"
        ? ErrorCode.PLAYER_NOT_FOUND
        : ErrorCode.INTERNAL_ERROR;
    throw new GraphQLError(result.error.message, {
      extensions: {
        code,
        ...(result.error.playerIds ? { playerIds: result.error.playerIds } : {}),
      },
    });
  }

  /** Merges a successful index result onto an EventEntry and saves it. */
  private async applyIndexResultToEntry(
    entry: EventEntry,
    result: IndexCalculationSuccess,
    origPlayerMap: Map<string, EntryCompetitionPlayer>,
    transaction: Transaction
  ): Promise<void> {
    const competitionPlayers: EntryCompetitionPlayer[] = result.resolvedPlayers.map((rp) => {
      const orig = origPlayerMap.get(rp.id);
      return {
        id: rp.id,
        gender: rp.gender ?? undefined,
        single: rp.single,
        double: rp.double,
        mix: rp.mix,
        levelException: orig?.levelException,
        levelExceptionReason: orig?.levelExceptionReason,
        levelExceptionRequested: orig?.levelExceptionRequested,
      };
    });
    entry.meta = {
      ...entry.meta,
      competition: { teamIndex: result.index, players: competitionPlayers },
    };
    await entry.save({ transaction, hooks: false } as Parameters<typeof entry.save>[0]);
  }

  /**
   * Core team-creation logic shared by createTeam and createTeams.
   * Does NOT commit or rollback — the caller owns the transaction.
   */
  private async _createTeamCore(
    newTeamData: TeamNewInput,
    nationalCountsAsMixed: boolean,
    user: Player,
    transaction: Transaction
  ): Promise<{
    result: TeamResult;
    indexPayload?: {
      input: IndexCalculationInput;
      entryId: string;
      entry: EventEntry;
      origPlayerMap: Map<string, EntryCompetitionPlayer>;
      clubId: string;
    };
  }> {
    const userId = user?.id ?? null;
    const clubId = newTeamData.clubId ?? "";

    const dbClub = await Club.findByPk(clubId, { transaction });
    if (!dbClub) {
      this.logger.warn({ code: ErrorCode.CLUB_NOT_FOUND, clubId, userId });
      throw new GraphQLError(`Club not found: ${clubId}`, {
        extensions: { code: ErrorCode.CLUB_NOT_FOUND, clubId },
      });
    }

    if (!(await user.hasAnyPermission([`${dbClub.id}_edit:club`, "edit-any:club"]))) {
      this.logger.warn({ code: ErrorCode.PERMISSION_DENIED, clubId: dbClub.id, userId });
      throw new GraphQLError("You do not have permission to create a team for this club.", {
        extensions: { code: ErrorCode.PERMISSION_DENIED, userId, clubId: dbClub.id },
      });
    }

    if (newTeamData.link) {
      const existing = await Team.findOne({
        where: { link: newTeamData.link, season: newTeamData.season },
        transaction,
      });
      if (existing) {
        return { result: { teamId: existing.id, clubId: dbClub.id, alreadyExisted: true } };
      }
    }

    if (!newTeamData.teamNumber) {
      const types = [newTeamData.type];
      if (nationalCountsAsMixed && newTeamData.type === SubEventTypeEnum.MX) {
        types.push(SubEventTypeEnum.NATIONAL);
      }
      const highestNumber = (await Team.max("teamNumber", {
        where: { clubId: dbClub.id, type: { [Op.or]: types }, season: newTeamData.season },
      })) as number;
      newTeamData.teamNumber = highestNumber + 1;
    }

    const { players, entry, ...teamData } = newTeamData;
    const teamDb = await Team.create({ ...(teamData as Team) }, { transaction });
    await teamDb.setClub(dbClub, { transaction });

    if (players) {
      this.logger.debug(`Adding players to team ${teamDb.name}`);
      const dbPlayers = await Player.findAll({
        where: { id: players.map((p) => p.id) },
        transaction,
      });
      await Promise.all(
        players.map(async (player) => {
          const dbPlayer = dbPlayers.find((p) => p.id === player.id);
          if (!dbPlayer) {
            this.logger.warn({
              code: ErrorCode.PLAYER_NOT_FOUND,
              playerId: player.id,
              clubId: dbClub.id,
              userId,
            });
            throw new GraphQLError(`Player not found: ${player.id}`, {
              extensions: { code: ErrorCode.PLAYER_NOT_FOUND, playerId: player.id },
            });
          }
          await teamDb.addPlayer(dbPlayer, {
            through: { membershipType: player.membershipType, start: new Date() },
            transaction,
          });
        })
      );
    }

    if (entry) {
      this.logger.debug(`Adding entry to team ${teamDb.name}`);
      const [dbEntry] = await EventEntry.findOrCreate({
        where: { teamId: teamDb.id, subEventId: entry.subEventId, entryType: "competition" },
        defaults: { ...(entry as EventEntry) },
        transaction,
        hooks: false,
      });

      if (entry?.meta?.competition?.players) {
        const playerIds = (entry.meta.competition.players.map((p) => p.id) || []) as string[];
        const origPlayerMap = new Map(
          entry.meta.competition.players.map((p) => [p.id as string, p as EntryCompetitionPlayer])
        );
        return {
          result: { teamId: teamDb.id, clubId: dbClub.id, alreadyExisted: false },
          indexPayload: {
            input: {
              key: dbEntry.id!,
              type: teamDb.type,
              subEventCompetitionId: entry.subEventId,
              players: playerIds.map((id) => ({ id })),
            },
            entryId: dbEntry.id!,
            entry: dbEntry,
            origPlayerMap,
            clubId: dbClub.id,
          },
        };
      }
    }

    return { result: { teamId: teamDb.id, clubId: dbClub.id, alreadyExisted: false } };
  }

  @Query(() => Team)
  async team(@Args("id", { type: () => ID }) id: string): Promise<Team> {
    const team = IsUUID(id)
      ? await Team.findByPk(id)
      : await Team.findOne({
          where: {
            slug: id,
          },
        });

    if (!team) {
      throw new NotFoundException(id);
    }
    return team;
  }

  @Query(() => [Team])
  async teams(@Args() listArgs: ListArgs): Promise<Team[]> {
    const args = ListArgs.toFindOptions(listArgs);
    return Team.findAll(args);
  }

  @ResolveField(() => [PlayerWithTeamMembershipType])
  async players(@Parent() team: Team, @Args() listArgs: ListArgs) {
    // When no list args are supplied (the common GetClubTeams case) we batch
    // all per-team Player lookups across the request into a single query via
    // TeamAssociationService. When filters/pagination are supplied we fall
    // back to the per-team association call so the args take effect.
    const hasFilters = !!(listArgs.where || listArgs.take || listArgs.skip || listArgs.order);
    if (!hasFilters) {
      return this.teamAssociationService.getPlayers(team);
    }
    return team.getPlayers(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => String)
  async phone(@User() user: Player, @Parent() team: Team) {
    const perm = [`details-any:team`, `${team.clubId}_details:team`];
    if (!(await user.hasAnyPermission(perm))) {
      return null;
    }

    return team.phone;
  }

  @ResolveField(() => String)
  async abbreviation(@User() user: Player, @Parent() team: Team) {
    if (team.abbreviation) {
      return team.abbreviation;
    }

    // if the team does not have an abbreviation, generate one
    await Team.generateAbbreviation(team);
    await team.save();

    return team.abbreviation;
  }

  @ResolveField(() => String)
  async email(@User() user: Player, @Parent() team: Team) {
    const perm = [`details-any:team`, `${team.clubId}_details:team`];
    if (!(await user.hasAnyPermission(perm))) {
      return null;
    }

    return team.email;
  }

  @ResolveField(() => EventEntry, { nullable: true })
  async entry(@Parent() team: Team): Promise<EventEntry | null> {
    // Delegates to TeamAssociationService which:
    //   1. Batches all per-team EventEntry lookups in a request into one
    //      `EventEntry.findAll({ teamId: Op.in([...]) })`.
    //   2. Groups results by teamId and preserves the existing fallback
    //      logic: prefer an entry with a `drawId` (federation sync has
    //      pinned the team to a draw); otherwise fall back to any entry
    //      for the team (covers freshly-enrolled teams with drawId=NULL).
    //      See team-association.service.ts:loadEntriesByTeamIds.
    return this.teamAssociationService.getEntry(team);
  }

  @ResolveField(() => Location)
  async locations(@Parent() team: Team): Promise<Location | null> {
    return this.teamAssociationService.getPrefferedLocation(team);
  }

  @ResolveField(() => Player)
  async captain(@Parent() team: Team): Promise<Player | null> {
    return this.teamAssociationService.getCaptain(team);
  }

  @ResolveField(() => Club)
  async club(@Parent() team: Team): Promise<Club | null> {
    return this.teamAssociationService.getClub(team);
  }

  // Object

  @Mutation(() => Boolean)
  async deleteTeams(
    @Args("clubId", { type: () => ID }) clubId: string,
    @Args("season", { type: () => Int }) season: number,
    @User() user: Player
  ): Promise<boolean> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbClub = await Club.findByPk(clubId, { transaction });

      if (!dbClub) {
        throw new NotFoundException(`${Club.name}: ${clubId}`);
      }

      if (!(await user.hasAnyPermission([`${dbClub.id}_edit:club`, "edit-any:club"]))) {
        throw new UnauthorizedException(`You do not have permission to delete teams`);
      }

      await Team.destroy({
        where: {
          clubId,
          season,
        },
        transaction,
      });

      await transaction.commit();
      return true;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => TeamResult, {
    description:
      "Create a team for a club. Idempotent on (link, season): when an existing team is found for that pair, returns success with alreadyExisted: true and no writes. To update an existing team, use updateTeam. Failures surface as GraphQLError with a stable extensions.code (CLUB_NOT_FOUND, PERMISSION_DENIED, PLAYER_NOT_FOUND, RANKING_NOT_FOUND, INTERNAL_ERROR).",
  })
  async createTeam(
    @Args("data") newTeamData: TeamNewInput,
    @Args("nationalCountsAsMixed", { type: () => Boolean })
    nationalCountsAsMixed: boolean,
    @User() user: Player
  ): Promise<TeamResult> {
    const userId = user?.id ?? null;
    const clubId = newTeamData.clubId ?? "";
    const transaction = await this._sequelize.transaction();
    try {
      const core = await this._createTeamCore(
        newTeamData,
        nationalCountsAsMixed,
        user,
        transaction
      );
      if (core.indexPayload) {
        const [calcResult] = await this.indexCalculationService.calculate(
          [core.indexPayload.input],
          { transaction, caller: "TeamsResolver.createTeam" }
        );
        if (isFailure(calcResult)) {
          this.indexFailureToGraphQLError(calcResult, { clubId: core.indexPayload.clubId, userId });
        }
        await this.applyIndexResultToEntry(
          core.indexPayload.entry,
          calcResult as IndexCalculationSuccess,
          core.indexPayload.origPlayerMap,
          transaction
        );
      }
      await transaction.commit();
      return core.result;
    } catch (e) {
      await transaction.rollback();
      if (e instanceof GraphQLError) throw e;
      this.logger.error(
        { code: ErrorCode.INTERNAL_ERROR, clubId, userId },
        e instanceof Error ? e.stack : String(e)
      );
      throw new GraphQLError("Internal error.", { extensions: { code: ErrorCode.INTERNAL_ERROR } });
    }
  }

  @Mutation(() => [TeamResult])
  async createTeams(
    @Args("data", {
      type: () => [TeamNewInput],
    })
    newTeamData: TeamNewInput[],
    @Args("nationalCountsAsMixed", { type: () => Boolean })
    nationalCountsAsMixed: boolean,
    @User() user: Player
  ): Promise<TeamResult[]> {
    const userId = user?.id ?? null;
    const transaction = await this._sequelize.transaction();
    try {
      const cores: Awaited<ReturnType<typeof this._createTeamCore>>[] = [];

      // Sequential — NOT parallel. Team number auto-assignment uses Team.max + 1
      // which is non-atomic; concurrent calls produce duplicate team numbers.
      for (const team of newTeamData.sort((a, b) => {
        if (a.type === SubEventTypeEnum.MX && b.type === SubEventTypeEnum.NATIONAL) return 1;
        if (a.type === SubEventTypeEnum.NATIONAL && b.type === SubEventTypeEnum.MX) return -1;
        if (a.type === b.type) return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
        return (a.type ?? a.name ?? "").localeCompare(b.type ?? b.name ?? "");
      })) {
        this.logger.debug(`Creating team ${team.name}`);
        cores.push(await this._createTeamCore(team, nationalCountsAsMixed, user, transaction));
      }

      const payloads = cores.flatMap((c) => (c.indexPayload ? [c.indexPayload] : []));
      if (payloads.length > 0) {
        const calcResults = await this.indexCalculationService.calculate(
          payloads.map((p) => p.input),
          { transaction, caller: "TeamsResolver.createTeams" }
        );
        for (const r of calcResults) {
          if (isFailure(r)) {
            const payload = payloads.find((p) => p.entryId === r.key);
            this.indexFailureToGraphQLError(r, { clubId: payload?.clubId, userId });
          }
          const payload = payloads.find((p) => p.entryId === r.key)!;
          await this.applyIndexResultToEntry(
            payload.entry,
            r as IndexCalculationSuccess,
            payload.origPlayerMap,
            transaction
          );
        }
      }

      await transaction.commit();
      return cores.map((c) => c.result);
    } catch (e) {
      await transaction.rollback();
      if (e instanceof GraphQLError) throw e;
      this.logger.error(
        { code: ErrorCode.INTERNAL_ERROR, userId },
        e instanceof Error ? e.stack : String(e)
      );
      throw new GraphQLError("Internal error.", { extensions: { code: ErrorCode.INTERNAL_ERROR } });
    }
  }

  @Mutation(() => Team)
  async updateTeam(
    @Args("data") updateTeamData: TeamUpdateInput,
    @User() user: Player
  ): Promise<Team> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbTeam = await Team.findByPk(updateTeamData.id, {
        include: [{ model: Club }, { model: Player, as: "players" }],
      });

      if (!dbTeam) {
        throw new NotFoundException(`${Team.name}: ${updateTeamData.id}`);
      }

      if (!(await user.hasAnyPermission([`${dbTeam.clubId}_edit:club`, "edit-any:club"]))) {
        throw new UnauthorizedException(`You do not have permission to update a team`);
      }

      if (updateTeamData.players) {
        const playerIds = updateTeamData.players.map((p) => p.id);

        const currentPlayers = await dbTeam.getPlayers({ transaction });
        const currentPlayerIds = currentPlayers.map((p) => p.id);

        const playersToAdd = playerIds.filter((id) => !currentPlayerIds.includes(id));
        const playersToRemove = currentPlayerIds.filter((id) => !playerIds.includes(id));

        if (playersToRemove.length > 0) {
          const removePlayers = await Player.findAll({
            where: { id: playersToRemove },
            transaction,
          });
          await dbTeam.removePlayers(removePlayers, { transaction });
        }

        if (playersToAdd.length > 0) {
          const addPlayers = await Player.findAll({
            where: { id: playersToAdd },
            transaction,
          });
          await dbTeam.addPlayers(addPlayers, {
            through: { start: new Date() },
            transaction,
          });
        }
      }

      await dbTeam.update({ ...dbTeam.toJSON(), ...updateTeamData } as Team, { transaction });

      // await dbTeam.update(location, { transaction });
      await transaction.commit();
      return dbTeam;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Boolean)
  async deleteTeam(
    @Args("id", { type: () => ID }) id: number,
    @User() user: Player
  ): Promise<boolean> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbTeam = await Team.findByPk(id, { transaction });

      if (!dbTeam) {
        throw new NotFoundException(`${Team.name}: ${id}`);
      }

      if (!(await user.hasAnyPermission([`${dbTeam.clubId}_edit:club`, "edit-any:club"]))) {
        throw new UnauthorizedException(`You do not have permission to delete a team`);
      }

      await dbTeam.destroy({ transaction });

      await transaction.commit();
      return true;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  // Adding / removing links
  @Mutation(() => Team)
  async addPlayerFromTeam(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("playerId", { type: () => ID }) playerId: string,
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`Team ${teamId}`);
    }

    const perm = [`${team.clubId}_edit:team`, "edit-any:club"];
    if (!(await user.hasAnyPermission(perm))) {
      throw new UnauthorizedException();
    }

    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(playerId);
    }

    await team.addPlayer(player, {
      through: {
        start: new Date(),
      },
    });

    return team;
  }

  @Mutation(() => Team)
  async removePlayerFromTeam(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("playerId", { type: () => ID }) playerId: string,
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, "edit-any:club"];
    if (!(await user.hasAnyPermission(perm))) {
      throw new UnauthorizedException();
    }

    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(`${Player.name}: ${playerId}`);
    }

    await team.removePlayer(player);
    return team;
  }

  @Mutation(() => EventEntry)
  async removeBasePlayerForSubEvent(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("playerId", { type: () => ID }) playerId: string,
    @Args("subEventId", { type: () => ID }) subEventId: string,
    @User() user: Player
  ) {
    const perm = [`change-base:team`, "edit-any:club"];
    const transaction = await this._sequelize.transaction();
    try {
      const team = await Team.findByPk(teamId);

      if (!team) {
        throw new NotFoundException(`${Team.name}: ${teamId}`);
      }

      if (!(await user.hasAnyPermission(perm))) {
        throw new UnauthorizedException();
      }

      const player = await Player.findByPk(playerId);
      if (!player) {
        throw new NotFoundException(`${Player.name}: ${playerId}`);
      }

      const entry = await EventEntry.findOne({
        where: {
          teamId: teamId,
          subEventId,
        },
        transaction,
      });
      if (!entry) {
        throw new NotFoundException(`${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`);
      }

      const meta = entry.meta;
      const removedPlayer = meta?.competition?.players.filter((p) => p.id === playerId)[0];
      if (!removedPlayer) {
        throw new BadRequestException("Player not part of base?");
      }

      if (!meta?.competition?.players) {
        throw new BadRequestException("No players in base?");
      }

      meta.competition.players = meta?.competition?.players.filter((p) => p.id !== playerId);

      entry.meta = meta;
      entry.changed("meta", true);

      await entry.save({ transaction });

      await transaction.commit();
      return entry;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => EventEntry)
  async addBasePlayerForSubEvent(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("playerId", { type: () => ID }) playerId: string,
    @Args("subEventId", { type: () => ID }) subEventId: string,
    @User() user: Player
  ) {
    const perm = [`change-base:team`, "edit-any:club"];
    const transaction = await this._sequelize.transaction();
    try {
      const team = await Team.findByPk(teamId);

      if (!team) {
        throw new NotFoundException(`${Team.name}: ${teamId}`);
      }

      if (!(await user.hasAnyPermission(perm))) {
        throw new UnauthorizedException();
      }

      const player = await Player.findByPk(playerId);
      if (!player) {
        throw new NotFoundException(`${Player.name}: ${playerId}`);
      }

      const entry = await EventEntry.findOne({
        where: {
          teamId: teamId,
          subEventId,
        },
        transaction,
      });
      if (!entry) {
        throw new NotFoundException(`${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`);
      }

      // create meta if not exists
      if (!entry.meta) {
        entry.meta = {
          competition: {
            teamIndex: -1,
            players: [],
          },
        };
      }

      entry.meta?.competition?.players.push({
        id: player.id,
        single: -1,
        double: -1,
        mix: -1,
        gender: player.gender,
      });

      entry.changed("meta", true);
      await entry.save({ transaction });

      await transaction.commit();

      return entry;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => EventEntry)
  async updatePlayerMetaForSubEvent(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("subEventId", { type: () => ID }) subEventId: string,
    @Args("player", { type: () => EntryCompetitionPlayersInputType })
    playerCompetition: EntryCompetitionPlayersInputType,
    @User() user: Player
  ) {
    const perm = [`change-base:team`, "edit-any:club"];
    const transaction = await this._sequelize.transaction();
    try {
      const team = await Team.findByPk(teamId);

      if (!team) {
        throw new NotFoundException(`${Team.name}: ${teamId}`);
      }

      if (!(await user.hasAnyPermission(perm))) {
        throw new UnauthorizedException();
      }

      const player = await Player.findByPk(playerCompetition.id);
      if (!player) {
        throw new NotFoundException(`${Player.name}: ${playerCompetition.id}`);
      }

      const entry = await EventEntry.findOne({
        where: {
          teamId: teamId,
          subEventId,
        },
        transaction,
      });
      if (!entry) {
        throw new NotFoundException(`${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`);
      }

      const currentPlayer = entry.meta?.competition?.players.find(
        (p) => p.id === playerCompetition.id
      );
      if (!currentPlayer) {
        throw new BadRequestException("Player not part of base?");
      }

      // update the current player with the new values
      const updatedPlayer = {
        ...currentPlayer,
        ...playerCompetition,
      };

      if (!entry.meta?.competition?.players) {
        throw new BadRequestException("No players in base?");
      }

      // update the player in the meta
      entry.meta.competition.players = entry.meta.competition.players.map((p) =>
        p.id === playerCompetition.id ? updatedPlayer : p
      );

      // create a new meta object to trigger the update
      entry.meta = {
        ...entry.meta,
      };
      entry.changed("meta", true);
      await entry.save({ transaction });

      await transaction.commit();
      return entry;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Team)
  async removeLocationFromTeam(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("locationId", { type: () => ID }) locationId: string,
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, "edit-any:club"];
    if (!(await user.hasAnyPermission(perm))) {
      throw new UnauthorizedException();
    }

    const location = await Location.findByPk(locationId);
    if (!location) {
      throw new NotFoundException(`${Location.name}: ${locationId}`);
    }

    await team.setPrefferedLocation(undefined);

    return team;
  }

  @Mutation(() => Team)
  async addLocationFromTeam(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("locationId", { type: () => ID }) locationId: string,
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, "edit-any:club"];
    if (!(await user.hasAnyPermission(perm))) {
      throw new UnauthorizedException();
    }

    const location = await Location.findByPk(locationId);
    if (!location) {
      throw new NotFoundException(`${Location.name}: ${locationId}`);
    }

    await team.setPrefferedLocation(location);

    return team;
  }

  @Mutation(() => PlayerWithTeamMembershipType)
  async updateTeamPlayerMembership(
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("playerId", { type: () => ID }) playerId: string,
    @Args("membershipType", { type: () => String })
    membershipType: TeamMembershipType
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }

    const player = await Player.findByPk(playerId);

    if (!player) {
      throw new NotFoundException(`${Player.name}: ${playerId}`);
    }

    const membership = await TeamPlayerMembership.findOne({
      where: {
        teamId,
        playerId,
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `${TeamPlayerMembership.name}: Team: ${teamId}, Player: ${playerId}`
      );
    }

    membership.membershipType = membershipType;
    await membership.save();
    return membership;
  }
}

@Resolver(() => TeamWithPlayerMembershipType)
export class TeamPlayerResolver extends TeamsResolver {
  @ResolveField(() => TeamPlayerMembership, { nullable: true })
  async clubMembership(
    @Parent() team: Team & { TeamPlayerMembership: TeamPlayerMembership }
  ): Promise<TeamPlayerMembership> {
    return team.TeamPlayerMembership;
  }
}

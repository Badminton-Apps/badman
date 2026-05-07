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
  IndexCalculationService,
  isFailure,
} from "@badman/backend-enrollment";
import {
  IsUUID,
  SubEventTypeEnum,
  TeamMembershipType,
  getLetterForRegion,
} from "@badman/utils";
import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode, ListArgs } from "../../utils";
import { TeamResult } from "./team-result.object";

@Resolver(() => Team)
export class TeamsResolver {
  private readonly logger = new Logger(TeamsResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private readonly indexCalculationService: IndexCalculationService
  ) {}

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
    // Get all entries for the team
    const entries = await EventEntry.findAll({
      where: {
        teamId: team.id,
      },
    });

    // Prefer an entry that has been assigned to a draw: once the federation
    // sync has run the draw assignment, the entry carries a `drawId` and that
    // entry is the authoritative one (it pins the team to a specific draw
    // within the subEvent, which is what the encounter/calendar views need).
    //
    // However, between team enrollment and the draw being made, entries
    // exist with `drawId = NULL`. They still carry the `subEventId`, which
    // is enough for the frontend to resolve `entry.subEventCompetition` and
    // render the division/Liga label and the edit dialog's competition
    // field. Before this fallback, freshly-enrolled teams (new enrollment
    // flow) showed up in the club-teams list without a division until the
    // sync had assigned a draw, even though the data needed to render the
    // division was already present on the entry.
    //
    // Why both enrollment paths produce drawId = NULL:
    //   - Old createTeam mutation (this file, ~line 296) does
    //     EventEntry.findOrCreate keyed on (teamId, subEventId, entryType);
    //     `EventEntryNewInput` has no `drawId` field, so it is never written.
    //   - New enrollment flow (EnrollmentEntryService, ~line 110) does
    //     `EventEntry.create({}, { transaction })` with an empty payload and
    //     then attaches teamId via `team.setEntry` and subEventId via
    //     `subEvent.addEventEntry`. Again no `drawId`.
    // The only place `drawId` gets populated is the federation sync. See
    // apps/worker/sync/.../competition/processors/standing.processor.ts —
    // it loads the team with its existing EventEntry filtered by the draw's
    // subEventId, then runs `entryDraw.drawId = draw.id; entryDraw.save()`.
    // So sync amends the row created at enrollment time in place; it does
    // not create a duplicate. Once sync has run, the `find(e => e.drawId)`
    // branch below wins again and this fallback becomes a no-op.
    //
    // Strategy: take the drawId-bearing entry when one exists, otherwise
    // fall back to any entry for the team. The order of `findAll` is not
    // guaranteed, but in practice a team has at most one entry per season
    // until the draw is made, so the fallback is unambiguous in the
    // pre-draw window.
    return entries.find((entry: EventEntry) => entry.drawId) ?? entries[0] ?? null;
  }

  @ResolveField(() => Location)
  async locations(@Parent() team: Team): Promise<Location> {
    return team.getPrefferedLocation();
  }

  @ResolveField(() => Player)
  async captain(@Parent() team: Team): Promise<Player> {
    return team.getCaptain();
  }

  @ResolveField(() => Club)
  async club(@Parent() team: Team): Promise<Club> {
    return team.getClub();
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
    const clubId = newTeamData.clubId;

    const transaction = await this._sequelize.transaction();
    try {
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

      // Idempotency: see specs/002-team-resolver-improvements/research.md §R2.
      // Updates flow through updateTeam (Linear BAD-128).
      if (newTeamData.link) {
        const existing = await Team.findOne({
          where: {
            link: newTeamData.link,
            season: newTeamData.season,
          },
          transaction,
        });
        if (existing) {
          await transaction.commit();
          return {
            teamId: existing.id,
            clubId: dbClub.id,
            alreadyExisted: true,
          };
        }
      }

      if (!newTeamData.teamNumber) {
        const types = [newTeamData.type];
        if (nationalCountsAsMixed && newTeamData.type === SubEventTypeEnum.MX) {
          types.push(SubEventTypeEnum.NATIONAL);
        }

        // Find the highest active team number for the club. Race window when
        // two concurrent creates omit teamNumber is out of scope (spec Q4).
        const highestNumber = (await Team.max("teamNumber", {
          where: {
            clubId: dbClub.id,
            type: { [Op.or]: types },
            season: newTeamData.season,
          },
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
              through: {
                membershipType: player.membershipType,
                start: new Date(),
              },
              transaction,
            });
          })
        );
      }

      if (entry) {
        this.logger.debug(`Adding entry to team ${teamDb.name}`);
        const [dbEntry] = await EventEntry.findOrCreate({
          where: {
            teamId: teamDb.id,
            subEventId: entry.subEventId,
            entryType: "competition",
          },
          defaults: { ...(entry as EventEntry) },
          transaction,
          hooks: false,
        });

        if (entry?.meta?.competition?.players) {
          // Delegate to IndexCalculationService for the canonical rank lookup
          // (validator's June 10 cutoff + min+2 fallback) and index math.
          const playerIds = (entry.meta.competition.players?.map((p) => p.id) || []) as string[];
          const result = await this.indexCalculationService.calculateOne(
            {
              key: dbEntry.id!,
              type: teamDb.type,
              subEventCompetitionId: entry.subEventId,
              players: playerIds.map((id) => ({ id })),
            },
            { transaction }
          );
          if (isFailure(result)) {
            this.logger.warn({
              code: result.error.code,
              clubId: dbClub.id,
              userId,
            }, result.error.message);
            const code =
              result.error.code === "PLAYER_NOT_FOUND"
                ? ErrorCode.PLAYER_NOT_FOUND
                : result.error.code === "RANKING_SYSTEM_NOT_FOUND"
                ? ErrorCode.INTERNAL_ERROR
                : ErrorCode.INTERNAL_ERROR;
            throw new GraphQLError(result.error.message, {
              extensions: {
                code,
                ...(result.error.playerIds ? { playerIds: result.error.playerIds } : {}),
              },
            });
          }

          const origById = new Map(
            entry.meta.competition.players.map((p) => [p.id, p])
          );
          const competitionPlayers: EntryCompetitionPlayer[] = result.resolvedPlayers.map(
            (rp) => {
              const orig = origById.get(rp.id);
              return {
                id: rp.id,
                gender: rp.gender,
                single: rp.single,
                double: rp.double,
                mix: rp.mix,
                levelException: orig?.levelException,
                levelExceptionReason: orig?.levelExceptionReason,
                levelExceptionRequested: orig?.levelExceptionRequested,
              };
            }
          );

          dbEntry.meta = {
            ...dbEntry.meta,
            competition: { teamIndex: result.index, players: competitionPlayers },
          };
          await dbEntry.save({ transaction, hooks: false });
        }
      }

      await transaction.commit();
      return {
        teamId: teamDb.id,
        clubId: dbClub.id,
        alreadyExisted: false,
      };
    } catch (e) {
      await transaction.rollback();
      if (e instanceof GraphQLError) {
        throw e;
      }
      this.logger.error(
        { code: ErrorCode.INTERNAL_ERROR, clubId, userId },
        e instanceof Error ? e.stack : String(e)
      );
      throw new GraphQLError("Internal error.", {
        extensions: { code: ErrorCode.INTERNAL_ERROR },
      });
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
    const results: TeamResult[] = [];

    // we need to sort the teams to make sure we create the teams in the right order
    for (const team of newTeamData.sort((a, b) => {
      // nationals should be before mixed
      if (a.type === SubEventTypeEnum.MX && b.type === SubEventTypeEnum.NATIONAL) {
        return 1;
      }
      if (a.type === SubEventTypeEnum.NATIONAL && b.type === SubEventTypeEnum.MX) {
        return -1;
      }

      if (a.type === b.type) {
        return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
      }
      return (a.type ?? a.name ?? "").localeCompare(b.type ?? b.name ?? "");
    })) {
      this.logger.debug(`Creating team ${team.name}`);
      const created = await this.createTeam(team, nationalCountsAsMixed, user);
      results.push(created);
    }

    return results;
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

      const changedTeams: Team[] = [];

      if (updateTeamData.teamNumber && updateTeamData.teamNumber !== dbTeam.teamNumber) {
        const conflict = await Team.findOne({
          where: {
            clubId: dbTeam.clubId,
            season: dbTeam.season,
            type: dbTeam.type,
            teamNumber: updateTeamData.teamNumber,
          },
          transaction,
        });
        if (conflict) {
          throw new GraphQLError("Team number already in use", {
            extensions: {
              code: ErrorCode.TEAM_NUMBER_CONFLICT,
              conflictingTeamId: conflict.id,
            },
          });
        }

        if (updateTeamData.teamNumber > dbTeam.teamNumber) {
          // Number was increased
          const dbLowerTeams = await Team.findAll({
            where: {
              clubId: dbTeam.clubId,
              teamNumber: {
                [Op.and]: [{ [Op.gt]: dbTeam.teamNumber }, { [Op.lte]: updateTeamData.teamNumber }],
              },
              season: dbTeam.season,
              type: dbTeam.type,
            },
            include: [Club],
            transaction,
          });
          for (const dbLteam of dbLowerTeams) {
            dbLteam.teamNumber--;
            dbLteam.name = `${dbLteam.club?.name ?? ""} ${dbLteam.teamNumber}${getLetterForRegion(dbLteam.type, "vl")}_temp`;
            dbLteam.abbreviation = `${dbLteam.club?.abbreviation ?? ""} ${dbLteam.teamNumber}${getLetterForRegion(dbLteam.type, "vl")}`;
            await dbLteam.save({ transaction, hooks: false });
            changedTeams.push(dbLteam);
          }
        } else if (updateTeamData.teamNumber < dbTeam.teamNumber) {
          // number was decreased
          const dbHigherTeams = await Team.findAll({
            where: {
              clubId: dbTeam.clubId,
              teamNumber: {
                [Op.and]: [{ [Op.lt]: dbTeam.teamNumber }, { [Op.gte]: updateTeamData.teamNumber }],
              },
              season: dbTeam.season,
              type: dbTeam.type,
            },
            include: [Club],
            transaction,
          });
          for (const dbHteam of dbHigherTeams) {
            dbHteam.teamNumber++;
            dbHteam.name = `${dbHteam.club?.name ?? ""} ${dbHteam.teamNumber}${getLetterForRegion(dbHteam.type, "vl")}_temp`;
            dbHteam.abbreviation = `${dbHteam.club?.abbreviation ?? ""} ${dbHteam.teamNumber}${getLetterForRegion(dbHteam.type, "vl")}`;
            await dbHteam.save({ transaction, hooks: false });
            changedTeams.push(dbHteam);
          }
        }
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

      if (changedTeams.length > 0) {
        for (const dbCteam of changedTeams) {
          await Team.generateName(dbCteam, { transaction });
          await Team.generateAbbreviation(dbCteam, { transaction });
          await dbCteam.save({ transaction, hooks: false });
        }
      }

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

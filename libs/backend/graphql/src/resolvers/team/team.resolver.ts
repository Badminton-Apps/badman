import { User } from '@badman/backend-authorization';
import {
  Club,
  EntryCompetitionPlayer,
  EntryCompetitionPlayersInputType,
  EventEntry,
  Location,
  Player,
  RankingLastPlace,
  RankingSystem,
  Team,
  TeamNewInput,
  TeamPlayerMembership,
  TeamPlayerMembershipType,
  TeamUpdateInput,
} from '@badman/backend-database';
import {
  IsUUID,
  TeamMembershipType,
  UseForTeamName,
  getIndexFromPlayers,
  getLetterForRegion,
} from '@badman/utils';
import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';
import { v4 as uuidv4 } from 'uuid';

@Resolver(() => Team)
export class TeamsResolver {
  private readonly logger = new Logger(TeamsResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Team)
  async team(@Args('id', { type: () => ID }) id: string): Promise<Team> {
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
    return Team.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [TeamPlayerMembershipType])
  async players(@Parent() team: Team, @Args() listArgs: ListArgs) {
    const players = (await team.getPlayers(
      ListArgs.toFindOptions(listArgs),
    )) as (Player & { TeamPlayerMembership: TeamPlayerMembership })[];

    return players?.map(
      (player: Player & { TeamPlayerMembership: TeamPlayerMembership }) => {
        return {
          ...player.TeamPlayerMembership.toJSON(),
          ...player.toJSON(),
        };
      },
    );
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
  async entry(@Parent() team: Team): Promise<EventEntry> {
    return team.getEntry();
  }

  @ResolveField(() => [Location])
  async locations(
    @Parent() team: Team,
    @Args() listArgs: ListArgs,
  ): Promise<Location[]> {
    return team.getLocations(ListArgs.toFindOptions(listArgs));
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

  @Mutation(() => Team)
  async createTeam(
    @Args('data') newTeamData: TeamNewInput,
    @User() user: Player,
  ): Promise<Team> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbClub = await Club.findByPk(newTeamData.clubId, {
        transaction,
      });

      if (!dbClub) {
        throw new NotFoundException(`${Club.name}: ${newTeamData.clubId}`);
      }

      if (
        !(await user.hasAnyPermission([
          `${dbClub.id}_edit:location`,
          'edit-any:club',
        ]))
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`,
        );
      }

      if (!newTeamData.teamNumber) {
        // Find the highst active team number for the club
        const highestNumber = (await Team.max('teamNumber', {
          where: {
            clubId: dbClub.id,
            type: newTeamData.type,
            season: newTeamData.season,
          },
        })) as number;

        // Increase by one (because we create new)
        newTeamData.teamNumber = highestNumber + 1;
      }

      // Create or find the team (that was inactive)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { players, entry, ...teamData } = newTeamData;
      let created = false;
      let teamDb: Team | null = null;

      if (teamData.link) {
        teamDb = await Team.findOne({
          where: {
            link: newTeamData.link,
            season: newTeamData.season,
          },
          transaction,
        });
      }

      if (!teamDb) {
        teamDb = await Team.create(
          {
            ...teamData,
          },
          { transaction },
        );
        created = true;
      }

      if (!created) {
        // update values
        teamDb.name = newTeamData.name;
        teamDb.phone = newTeamData.phone;
        teamDb.email = newTeamData.email;
        teamDb.abbreviation = newTeamData.abbreviation;
        teamDb.season = newTeamData.season;
        teamDb.type = newTeamData.type || teamDb.type;
        teamDb.teamNumber = newTeamData.teamNumber;
        teamDb.captainId = newTeamData.captainId;
        teamDb.preferredDay = newTeamData.preferredDay;
        teamDb.preferredTime = newTeamData.preferredTime;
        (teamDb.link = newTeamData.link ?? uuidv4()),
          await teamDb.save({ transaction });
      }
      if (created) {
        await teamDb.setClub(dbClub, { transaction });
      }

      if (newTeamData.players) {
        this.logger.debug(`Adding players to team ${teamDb.name}`);

        const dbPlayers = await Player.findAll({
          where: {
            id: newTeamData.players.map((p) => p.id),
          },
          transaction,
        });

        const dbMemberships = await TeamPlayerMembership.findAll({
          where: {
            teamId: teamDb.id,
          },
          transaction,
        });

        // add or update players
        await Promise.all(
          newTeamData.players.map(async (player) => {
            const dbPlayer = dbPlayers.find((p) => p.id === player.id);
            if (!dbPlayer) {
              throw new NotFoundException(`${Player.name}: ${player.id}`);
            }

            const membership = dbMemberships.find(
              (m) => m.playerId === dbPlayer.id,
            );

            if (membership) {
              if (membership.membershipType !== player.membershipType) {
                membership.membershipType = player.membershipType;
                await membership.save({ transaction });
              }
            } else {
              if (!teamDb) {
                throw new BadRequestException('Could not create team');
              }

              await teamDb.addPlayer(dbPlayer, {
                through: {
                  membershipType: player.membershipType,
                  start: new Date(),
                },
                transaction,
              });
            }
          }),
        );

        // remove players that are not in the new list
        await Promise.all(
          dbMemberships.map(async (membership) => {
            const player = newTeamData.players?.find(
              (p) => p.id === membership.playerId,
            );

            if (!player) {
              await membership.destroy({ transaction });
            }
          }),
        );
      }

      if (newTeamData.entry) {
        this.logger.debug(`Adding entry to team ${teamDb.name}`);

        let dbEntry = await teamDb.getEntry({ transaction });

        if (!dbEntry) {
          [dbEntry] = await EventEntry.findCreateFind({
            where: {
              teamId: teamDb.id,
              subEventId: newTeamData.entry.subEventId,
              entryType: 'competition',
            },
            defaults: {
              ...newTeamData.entry,
            },
            transaction,
            hooks: false,
          });
        } else {
          // Might be a new link
          dbEntry.subEventId = newTeamData.entry.subEventId;
        }

        if (newTeamData.entry?.meta?.competition?.players) {
          const system = await RankingSystem.findOne({
            where: {
              primary: true,
            },
            transaction,
          });

          if (!system) {
            throw new NotFoundException('No primary ranking system found');
          }

          const players: EntryCompetitionPlayer[] = [];
          const playerIds =
            newTeamData.entry.meta.competition.players?.map((p) => p.id) || [];

          const rankings = await RankingLastPlace.findAll({
            where: {
              playerId: playerIds,
              systemId: system.id,
            },
            transaction,
          });

          const dbPlayers = await Player.findAll({
            where: {
              id: playerIds,
            },
            transaction,
          });

          for (const p of newTeamData.entry.meta.competition.players) {
            const player = dbPlayers.find((dbPlayer) => dbPlayer.id === p.id);
            const ranking = rankings.find((r) => r.playerId === p.id);

            if (!player) {
              throw new NotFoundException(`Player ${p.id} not found`);
            }

            if (!ranking) {
              throw new NotFoundException(
                `Ranking for player ${p.id} not found`,
              );
            }

            players.push({
              id: player.id,
              gender: player.gender,
              single: ranking.single,
              double: ranking.double,
              mix: ranking.mix,
            });
          }

          const index = getIndexFromPlayers(teamDb.type, players);

          dbEntry.meta = {
            ...dbEntry.meta,
            competition: {
              teamIndex: index,
              players,
            },
          };

          await dbEntry.save({ transaction, hooks: false });
        }
      }

      await transaction.commit();
      return teamDb;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Team)
  async updateTeam(
    @Args('data') updateTeamData: TeamUpdateInput,
    @User() user: Player,
  ): Promise<Team> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbTeam = await Team.findByPk(updateTeamData.id, {
        include: [Club],
      });

      if (!dbTeam) {
        throw new NotFoundException(`${Team.name}: ${updateTeamData.id}`);
      }

      if (
        !(await user.hasAnyPermission([
          `${dbTeam.clubId}_edit:location`,
          'edit-any:club',
        ]))
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`,
        );
      }

      const changedTeams = [];

      if (
        updateTeamData.teamNumber &&
        updateTeamData.teamNumber !== dbTeam.teamNumber
      ) {
        updateTeamData.name = `${dbTeam.club?.name} ${
          updateTeamData.teamNumber
        }${getLetterForRegion(dbTeam.type, 'vl')}`;
        updateTeamData.abbreviation = `${dbTeam.club?.abbreviation} ${
          updateTeamData.teamNumber
        }${getLetterForRegion(dbTeam.type, 'vl')}`;

        if (updateTeamData.teamNumber > dbTeam.teamNumber) {
          // Number was increased
          const dbLowerTeams = await Team.findAll({
            where: {
              clubId: dbTeam.clubId,
              teamNumber: {
                [Op.and]: [
                  { [Op.gt]: dbTeam.teamNumber },
                  { [Op.lte]: updateTeamData.teamNumber },
                ],
              },
              season: dbTeam.season,
              type: dbTeam.type,
            },
            include: [Club],
            transaction,
          });
          // unique contraints
          for (const dbLteam of dbLowerTeams) {
            dbLteam.teamNumber--;
            // set teams to temp name for unique constraint
            this._setNameAndAbbreviation(dbLteam, true);
            await dbLteam.save({ transaction });

            changedTeams.push(dbLteam);
          }
        } else if (updateTeamData.teamNumber < dbTeam.teamNumber) {
          // number was decreased
          const dbHigherTeams = await Team.findAll({
            where: {
              clubId: dbTeam.clubId,
              teamNumber: {
                [Op.and]: [
                  { [Op.lt]: dbTeam.teamNumber },
                  { [Op.gte]: updateTeamData.teamNumber },
                ],
              },
              season: dbTeam.season,
              type: dbTeam.type,
            },
            include: [Club],
            transaction,
          });

          for (const dbHteam of dbHigherTeams) {
            dbHteam.teamNumber++;
            // set teams to temp name for unique constraint
            this._setNameAndAbbreviation(dbHteam, true);

            await dbHteam.save({ transaction });
            changedTeams.push(dbHteam);
          }
        }
      }

      await dbTeam.update(
        { ...dbTeam.toJSON(), ...updateTeamData },
        { transaction },
      );

      // revert to original name
      if (changedTeams.length > 0) {
        for (const dbCteam of changedTeams) {
          dbCteam.name = dbCteam.name?.replace('_temp', '');
          await dbCteam.save({ transaction });
        }
      }

      // await dbTeam.update(location, { transaction });
      await transaction.commit();
      return dbTeam;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Boolean)
  async deleteTeam(
    @Args('id', { type: () => ID }) id: number,
    @User() user: Player,
  ): Promise<boolean> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbTeam = await Team.findByPk(id, { transaction });

      if (!dbTeam) {
        throw new NotFoundException(`${Team.name}: ${id}`);
      }

      if (
        !(await user.hasAnyPermission([
          `${dbTeam.clubId}_edit:location`,
          'edit-any:club',
        ]))
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`,
        );
      }

      await dbTeam.destroy({ transaction });

      await transaction.commit();
      return true;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  /**
   * Sets the name and abbreviation for a team.
   * @param team The team to set the name and abbreviation for.
   * @param temp Whether to use the _temp suffix
   */

  private _setNameAndAbbreviation(team: Team, temp = false) {
    let prefix = team.club?.name;
    switch (team.club?.useForTeamName) {
      case UseForTeamName.NAME:
      case UseForTeamName.FULL_NAME:
        prefix = team.club?.name;
        break;
      case UseForTeamName.ABBREVIATION:
        prefix = team.club?.abbreviation;
        break;
      default:
        prefix = team.club?.name;
    }

    team.name = `${prefix} ${team.teamNumber}${getLetterForRegion(
      team.type,
      'vl',
    )}${temp ? '_temp' : ''}`;

    team.abbreviation = `${team.club?.abbreviation} ${
      team.teamNumber
    }${getLetterForRegion(team.type, 'vl')}`;
  }

  // Adding / removing links
  @Mutation(() => Team)
  async addPlayerFromTeam(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @User() user: Player,
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`Team ${teamId}`);
    }

    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
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
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @User() user: Player,
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
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
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @User() user: Player,
  ) {
    const perm = [`change-base:team`, 'edit-any:club'];
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
        throw new NotFoundException(
          `${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`,
        );
      }

      const meta = entry.meta;
      const removedPlayer = meta?.competition?.players.filter(
        (p) => p.id === playerId,
      )[0];
      if (!removedPlayer) {
        throw new BadRequestException('Player not part of base?');
      }

      if (!meta?.competition?.players) {
        throw new BadRequestException('No players in base?');
      }

      meta.competition.players = meta?.competition?.players.filter(
        (p) => p.id !== playerId,
      );

      entry.meta = meta;
      entry.changed('meta', true);

      await entry.save({ transaction });

      await transaction.commit();
      return entry;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => EventEntry)
  async addBasePlayerForSubEvent(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @User() user: Player,
  ) {
    const perm = [`change-base:team`, 'edit-any:club'];
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
        throw new NotFoundException(
          `${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`,
        );
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

      entry.changed('meta', true);
      await entry.save({ transaction });

      await transaction.commit();

      return entry;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => EventEntry)
  async updatePlayerMetaForSubEvent(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @Args('player', { type: () => EntryCompetitionPlayersInputType })
    playerCompetition: EntryCompetitionPlayersInputType,
    @User() user: Player,
  ) {
    const perm = [`change-base:team`, 'edit-any:club'];
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
        throw new NotFoundException(
          `${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`,
        );
      }

      const currentPlayer = entry.meta?.competition?.players.find(
        (p) => p.id === playerCompetition.id,
      );
      if (!currentPlayer) {
        throw new BadRequestException('Player not part of base?');
      }

      // update the current player with the new values
      const updatedPlayer = {
        ...currentPlayer,
        ...playerCompetition,
      };

      if (!entry.meta?.competition?.players) {
        throw new BadRequestException('No players in base?');
      }

      // update the player in the meta
      entry.meta.competition.players = entry.meta.competition.players.map(
        (p) => (p.id === playerCompetition.id ? updatedPlayer : p),
      );

      // create a new meta object to trigger the update
      entry.meta = {
        ...entry.meta,
      };
      entry.changed('meta', true);
      await entry.save({ transaction });

      await transaction.commit();
      return entry;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Team)
  async removeLocationFromTeam(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('locationId', { type: () => ID }) locationId: string,
    @User() user: Player,
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
    if (!(await user.hasAnyPermission(perm))) {
      throw new UnauthorizedException();
    }

    const location = await Location.findByPk(locationId);
    if (!location) {
      throw new NotFoundException(`${Location.name}: ${locationId}`);
    }

    await team.removeLocation(location);

    return team;
  }

  @Mutation(() => Team)
  async addLocationFromTeam(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('locationId', { type: () => ID }) locationId: string,
    @User() user: Player,
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
    if (!(await user.hasAnyPermission(perm))) {
      throw new UnauthorizedException();
    }

    const location = await Location.findByPk(locationId);
    if (!location) {
      throw new NotFoundException(`${Location.name}: ${locationId}`);
    }

    await team.addLocation(location);

    return team;
  }

  @Mutation(() => TeamPlayerMembershipType)
  async updateTeamPlayerMembership(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('membershipType', { type: () => String })
    membershipType: TeamMembershipType,
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
        `${TeamPlayerMembership.name}: Team: ${teamId}, Player: ${playerId}`,
      );
    }

    membership.membershipType = membershipType;
    await membership.save();
    return membership;
  }
}

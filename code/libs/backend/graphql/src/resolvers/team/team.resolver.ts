import { User } from '@badman/backend/authorization';
import {
  Club,
  EventCompetition,
  EventEntry,
  Location,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
  SubEventType,
  Team,
  TeamNewInput,
  TeamPlayerMembership,
  TeamUpdateInput,
} from '@badman/backend/database';
import {
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
import { Exception } from 'handlebars';
import moment from 'moment';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

@Resolver(() => Team)
export class TeamsResolver {
  private readonly logger = new Logger(TeamsResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Team)
  async team(@Args('id', { type: () => ID }) id: string): Promise<Team> {
    const team = await Team.findByPk(id);
    if (!team) {
      throw new NotFoundException(id);
    }
    return team;
  }

  @Query(() => [Team])
  async teams(@Args() listArgs: ListArgs): Promise<Team[]> {
    return Team.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Player])
  async players(
    @Parent() team: Team,
    @Args() listArgs: ListArgs
  ): Promise<(Player & TeamPlayerMembership)[][]> {
    const players = await team.getPlayers(ListArgs.toFindOptions(listArgs));

    return players?.map(
      (player: Player & { TeamPlayerMembership: TeamPlayerMembership }) => {
        return {
          ...player.TeamPlayerMembership.toJSON(),
          ...player.toJSON(),
        };
      }
    );
  }

  @ResolveField(() => String)
  async phone(@User() user: Player, @Parent() team: Team) {
    const perm = [`details-any:team`, `${team.clubId}_details:team`];
    if (user.hasAnyPermission(perm)) {
      return team.phone;
    } else {
      throw new UnauthorizedException();
    }
  }

  @ResolveField(() => String)
  async email(@User() user: Player, @Parent() team: Team) {
    const perm = [`details-any:team`, `${team.clubId}_details:team`];
    if (!user.hasAnyPermission(perm)) {
      throw new UnauthorizedException();
    }

    return team.email;
  }

  @ResolveField(() => [EventEntry])
  async entries(
    @Parent() team: Team,
    @Args() listArgs: ListArgs
  ): Promise<EventEntry[]> {
    return team.getEntries(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Location])
  async locations(
    @Parent() team: Team,
    @Args() listArgs: ListArgs
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

  @Mutation(() => Team)
  async addPlayerToTeam(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`Team ${teamId}`);
    }

    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
    if (!user.hasAnyPermission(perm)) {
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
  async updateBasePlayerTeam(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('base') base: boolean,
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }

    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
    if (!user.hasAnyPermission(perm)) {
      throw new UnauthorizedException();
    }

    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(playerId);
    }

    await TeamPlayerMembership.update(
      {
        teamId: team.id,
        playerId: player.id,
        base,
      },
      { where: { teamId: team.id, playerId: player.id } }
    );
    // const test = await GRAPHQL_CACHE.get('fqc:07b1794c5e168e308111a50f3c9d1935754344876843076b8654d69c3bd581ce');

    return team;
  }

  @Mutation(() => Team)
  async removeBasePlayerForSubEvent(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @User() user: Player
  ) {
    const perm = [`change-base:team`, 'edit-any:club'];
    const transaction = await this._sequelize.transaction();
    try {
      const team = await Team.findByPk(teamId);

      if (!team) {
        throw new NotFoundException(`${Team.name}: ${teamId}`);
      }

      if (!user.hasAnyPermission(perm)) {
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
          `${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`
        );
      }

      const meta = entry.meta;
      const removedPlayer = meta?.competition?.players.filter(
        (p) => p.id === playerId
      )[0];
      if (!removedPlayer) {
        throw new Exception('Player not part of base?');
      }

      meta.competition.players = meta?.competition.players.filter(
        (p) => p.id !== playerId
      );

      let bestPlayers = meta?.competition.players;
      if (meta?.competition.players.length > 4) {
        if (team.type === SubEventType.MX) {
          const male = meta?.competition.players
            .filter((p) => p.gender === 'M')
            .sort(
              (b, a) =>
                (b?.single ?? 12) +
                (b?.double ?? 12) +
                (b?.mix ?? 12) -
                ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
            )
            .slice(0, 2);
          const female = meta?.competition.players
            .filter((p) => p.gender === 'F')
            .sort(
              (b, a) =>
                (b?.single ?? 12) +
                (b?.double ?? 12) +
                (b?.mix ?? 12) -
                ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
            )
            .slice(0, 2);
          bestPlayers = [...male, ...female];
        } else {
          bestPlayers = meta?.competition.players
            .sort(
              (b, a) =>
                (b?.single ?? 12) +
                (b?.double ?? 12) -
                ((a?.single ?? 12) + (a?.double ?? 12))
            )
            .slice(0, 4);
        }
      }

      meta.competition.teamIndex = Team.getIndexFromPlayers(
        team.type,
        bestPlayers.map((p) => {
          return {
            single: p.single,
            double: p.double,
            mix: p.mix,
          };
        })
      );

      entry.meta = meta;
      entry.changed('meta', true);

      await entry.save({ transaction });

      await transaction.commit();
      return team;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Team)
  async addBasePlayerForSubEvent(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @User() user: Player
  ) {
    const perm = [`change-base:team`, 'edit-any:club'];
    const transaction = await this._sequelize.transaction();
    try {
      const team = await Team.findByPk(teamId);

      if (!team) {
        throw new NotFoundException(`${Team.name}: ${teamId}`);
      }

      if (!user.hasAnyPermission(perm)) {
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
          `${EventEntry.name}: Team: ${teamId}, SubEvent: ${subEventId}`
        );
      }

      const dbSubEvent = await SubEventCompetition.findByPk(subEventId, {
        attributes: [],
        include: [{ model: EventCompetition, attributes: ['startYear'] }],
      });

      const dbSystem = await RankingSystem.findOne({
        where: {
          primary: true,
        },
        transaction,
      });

      if (!dbSystem) {
        throw new NotFoundException(`${RankingSystem.name}: primary`);
      }

      const usedRankingDate = moment();
      usedRankingDate.set('year', dbSubEvent.eventCompetition.startYear);
      usedRankingDate.set(
        dbSubEvent.eventCompetition.usedRankingUnit,
        dbSubEvent.eventCompetition.usedRankingAmount
      );

      const startRanking = usedRankingDate.clone().set('date', 0);
      const endRanking = usedRankingDate.clone().clone().endOf('month');

      const dbRanking = await RankingPlace.findOne({
        where: {
          playerId: player.id,
          systemId: dbSystem.id,
          rankingDate: { [Op.between]: [startRanking, endRanking] },
        },
        transaction,
      });

      const meta = entry.meta;
      meta?.competition.players.push({
        id: player.id,
        single: dbRanking?.single ?? 12,
        double: dbRanking?.double ?? 12,
        mix: dbRanking?.mix ?? 12,
        gender: player.gender,
      });

      let bestPlayers = meta?.competition.players;
      if (meta?.competition.players.length > 4) {
        if (team.type === SubEventType.MX) {
          const male = meta?.competition.players
            .filter((p) => p.gender === 'M')
            .sort(
              (b, a) =>
                (b?.single ?? 12) +
                (b?.double ?? 12) +
                (b?.mix ?? 12) -
                ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
            )
            .slice(0, 2);

          const female = meta?.competition.players
            .filter((p) => p.gender === 'F')
            .sort(
              (b, a) =>
                (b?.single ?? 12) +
                (b?.double ?? 12) +
                (b?.mix ?? 12) -
                ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
            )
            .slice(0, 2);
          bestPlayers = [...male, ...female];
        } else {
          bestPlayers = meta?.competition.players
            .sort(
              (b, a) =>
                (b?.single ?? 12) +
                (b?.double ?? 12) -
                ((a?.single ?? 12) + (a?.double ?? 12))
            )
            .slice(0, 4);
        }
      }

      meta.competition.teamIndex = Team.getIndexFromPlayers(
        team.type,
        bestPlayers.map((p) => {
          return {
            single: p.single,
            double: p.double,
            mix: p.mix,
          };
        })
      );

      entry.meta = meta;
      entry.changed('meta', true);

      await entry.save({ transaction });

      await transaction.commit();
      return team;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Team)
  async removePlayerFromTeam(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
    if (!user.hasAnyPermission(perm)) {
      throw new UnauthorizedException();
    }

    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(`${Player.name}: ${playerId}`);
    }

    await team.removePlayer(player);
    return team;
  }

  @Mutation(() => Team)
  async createTeam(
    @Args('data') newTeamData: TeamNewInput,
    @User() user: Player
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
        !user.hasAnyPermission([`${dbClub.id}_edit:location`, 'edit-any:club'])
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`
        );
      }

      // Find the highst active team number for the club
      const highestNumber = (await Team.max('teamNumber', {
        where: { clubId: dbClub.id, type: newTeamData.type, active: true },
      })) as number;

      // Increase by one (because we create new)
      newTeamData.teamNumber = highestNumber + 1;

      // Create or find the team (that was inactive)
      const [teamDb, created] = await Team.findOrCreate({
        where: {
          type: newTeamData.type,
          teamNumber: newTeamData.teamNumber,
          clubId: newTeamData.clubId,
        },
        defaults: { ...newTeamData },
        transaction,
      });

      if (created) {
        await teamDb.setClub(dbClub, { transaction });
      } else {
        // Re-activate team
        teamDb.active = true;
        await teamDb.save({ transaction });
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
    @User() user: Player
  ): Promise<Team> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbTeam = await Team.findByPk(updateTeamData.id);

      if (!dbTeam) {
        throw new NotFoundException(`${Team.name}: ${updateTeamData.id}`);
      }

      if (
        !user.hasAnyPermission([
          `${dbTeam.clubId}_edit:location`,
          'edit-any:club',
        ])
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`
        );
      }

      const changedTeams = [];

      if (
        updateTeamData.teamNumber &&
        updateTeamData.teamNumber !== dbTeam.teamNumber
      ) {
        updateTeamData.name = `${dbTeam.club.name} ${
          updateTeamData.teamNumber
        }${Team.getLetterForRegion(dbTeam.type, 'vl')}`;
        updateTeamData.abbreviation = `${dbTeam.club.abbreviation} ${
          updateTeamData.teamNumber
        }${Team.getLetterForRegion(dbTeam.type, 'vl')}`;

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
              type: dbTeam.type,
            },
            transaction,
          });
          // unique contraints
          for (const dbLteam of dbLowerTeams) {
            dbLteam.teamNumber--;
            // set teams to temp name for unique constraint
            dbLteam.name = `${dbTeam.club.name} ${
              dbLteam.teamNumber
            }${Team.getLetterForRegion(dbLteam.type, 'vl')}_temp`;
            dbLteam.abbreviation = `${dbTeam.club.abbreviation} ${
              dbLteam.teamNumber
            }${Team.getLetterForRegion(dbLteam.type, 'vl')}`;
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
              type: dbTeam.type,
            },
            transaction,
          });
          for (const dbHteam of dbHigherTeams) {
            dbHteam.teamNumber++;
            // set teams to temp name for unique constraint
            dbHteam.name = `${dbTeam.club.name} ${
              dbHteam.teamNumber
            }${Team.getLetterForRegion(dbHteam.type, 'vl')}_temp`;
            dbHteam.abbreviation = `${dbTeam.club.abbreviation} ${
              dbHteam.teamNumber
            }${Team.getLetterForRegion(dbHteam.type, 'vl')}`;
            await dbHteam.save({ transaction });
            changedTeams.push(dbHteam);
          }
        }
      }

      await dbTeam.update(
        { ...dbTeam.toJSON(), ...updateTeamData },
        { transaction }
      );

      // await dbTeam.update(location, { transaction });
      await transaction.commit();
      return dbTeam;
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
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
    if (!user.hasAnyPermission(perm)) {
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
    @User() user: Player
  ) {
    const team = await Team.findByPk(teamId);

    if (!team) {
      throw new NotFoundException(`${Team.name}: ${teamId}`);
    }
    const perm = [`${team.clubId}_edit:team`, 'edit-any:club'];
    if (!user.hasAnyPermission(perm)) {
      throw new UnauthorizedException();
    }

    const location = await Location.findByPk(locationId);
    if (!location) {
      throw new NotFoundException(`${Location.name}: ${locationId}`);
    }

    await team.addLocation(location);
    return team;
  }
}

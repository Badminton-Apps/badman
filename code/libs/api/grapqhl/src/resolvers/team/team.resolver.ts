import {
  EventEntry,
  Location,
  Player,
  Team,
  TeamPlayerMembership,
} from '@badman/api/database';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { User } from '../../decorators';
import { ListArgs } from '../../utils';

@Resolver(() => Team)
export class TeamsResolver {
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

  // @ResolveField(() => [Player])
  // async players(
  //   @Parent() team: Team,
  //   @Args() listArgs: ListArgs
  // ): Promise<Player[]> {
  //   const test = await team.getPlayers({ ...ListArgs.toFindOptions(listArgs) });

  //   return test.filter(
  //     (p) => p.getDataValue('TeamPlayerMembership')?.end === null
  //   );
  // }

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

    await TeamPlayerMembership.update(
      {
        teamId: team.id,
        playerId: player.id,
        base,
      },
      { where: { teamId: team.id, playerId: player.id } }
    );

    return team;
  }
  // @Mutation(returns => Team)
  // async addTeam(
  //   @Args('newTeamData') newTeamData: NewTeamInput,
  // ): Promise<Team> {
  //   const recipe = await this.recipesService.create(newTeamData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeTeam(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

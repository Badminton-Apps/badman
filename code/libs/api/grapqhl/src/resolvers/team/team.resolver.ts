import { Player, Team, TeamPlayerMembership } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';
import { TeamsArgs } from './dto/team.args';

@Resolver(() => Team)
export class TeamsResolver {
  @Query(() => Team)
  async team(@Args('id') id: string): Promise<Team> {
    const team = await Team.findByPk(id);
    if (!team) {
      throw new NotFoundException(id);
    }
    return team;
  }

  @Query(() => [Team])
  async teams(@Args() teamsArgs: TeamsArgs): Promise<Team[]> {
    return Team.findAll({
      limit: teamsArgs.take,
      offset: teamsArgs.skip,
    });
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

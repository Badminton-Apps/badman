import { Team } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
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

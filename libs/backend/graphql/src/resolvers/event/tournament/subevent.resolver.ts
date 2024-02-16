import {
  DrawTournament,
  EventTournament,
  RankingGroup,
  SubEventTournament,
} from '@badman/backend-database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@Resolver(() => SubEventTournament)
export class SubEventTournamentResolver {
  @Query(() => SubEventTournament)
  async subEventTournament(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SubEventTournament> {
    const subEventTournament = await SubEventTournament.findByPk(id);

    if (!subEventTournament) {
      throw new NotFoundException(id);
    }
    return subEventTournament;
  }

  @Query(() => [SubEventTournament])
  async subEventTournaments(@Args() listArgs: ListArgs): Promise<SubEventTournament[]> {
    return SubEventTournament.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [DrawTournament])
  async drawTournaments(
    @Parent() subEvent: SubEventTournament,
    @Args() listArgs: ListArgs,
  ): Promise<DrawTournament[]> {
    return subEvent.getDrawTournaments(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EventTournament)
  async eventTournament(@Parent() subEvent: SubEventTournament): Promise<EventTournament> {
    return subEvent.getEvent();
  }

  @ResolveField(() => [RankingGroup])
  async rankingGroups(@Parent() subEvent: SubEventTournament): Promise<RankingGroup[]> {
    return subEvent.getRankingGroups();
  }

  // @Mutation(returns => SubEventTournament)
  // async addSubEventTournament(
  //   @Args('newSubEventTournamentData') newSubEventTournamentData: NewSubEventTournamentInput,
  // ): Promise<SubEventTournament> {
  //   const recipe = await this.recipesService.create(newSubEventTournamentData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeSubEventTournament(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

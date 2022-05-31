import { EventTournament, SubEventTournament } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@Resolver(() => SubEventTournament)
export class SubEventTournamentResolver {
  @Query(() => SubEventTournament)
  async encounterTournament(
    @Args('id', { type: () => ID }) id: string
  ): Promise<SubEventTournament> {
    let encounterTournament = await SubEventTournament.findByPk(id);

    if (!encounterTournament) {
      encounterTournament = await SubEventTournament.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!encounterTournament) {
      throw new NotFoundException(id);
    }
    return encounterTournament;
  }

  @Query(() => [SubEventTournament])
  async encounterTournaments(
    @Args() listArgs: ListArgs
  ): Promise<SubEventTournament[]> {
    return SubEventTournament.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EventTournament)
  async event(
    @Parent() subEvent: SubEventTournament
  ): Promise<EventTournament> {
    return subEvent.getEvent();
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

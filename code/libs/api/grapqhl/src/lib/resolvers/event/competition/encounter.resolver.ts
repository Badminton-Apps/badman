import {
  DrawCompetition,
  EncounterCompetition,
  Team,
} from '@badman/api/database';
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

@Resolver(() => EncounterCompetition)
export class EncounterCompetitionResolver {
  @Query(() => EncounterCompetition)
  async encounterCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EncounterCompetition> {
    let encounterCompetition = await EncounterCompetition.findByPk(id);

    if (!encounterCompetition) {
      encounterCompetition = await EncounterCompetition.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => [EncounterCompetition])
  async encounterCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<EncounterCompetition[]> {
    return EncounterCompetition.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => DrawCompetition)
  async draw(
    @Parent() encounter: EncounterCompetition
  ): Promise<DrawCompetition> {
    return encounter.getDraw();
  }

  @ResolveField(() => Team)
  async home(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getHome();
  }

  @ResolveField(() => Team)
  async away(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getAway();
  }

  // @Mutation(returns => EncounterCompetition)
  // async addEncounterCompetition(
  //   @Args('newEncounterCompetitionData') newEncounterCompetitionData: NewEncounterCompetitionInput,
  // ): Promise<EncounterCompetition> {
  //   const recipe = await this.recipesService.create(newEncounterCompetitionData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeEncounterCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

import {
  DrawCompetition,
  EncounterCompetition,
  Team,
} from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEncounterCompetition {
  @Field()
  count: number;

  @Field(() => [EncounterCompetition])
  rows: EncounterCompetition[];
}

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

  @Query(() => PagedEncounterCompetition)
  async encounterCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterCompetition[] }> {
    return EncounterCompetition.findAndCountAll(
      ListArgs.toFindOptions(listArgs)
    );
  }

  @ResolveField(() => DrawCompetition)
  async drawCompetition(
    @Parent() encounter: EncounterCompetition
  ): Promise<DrawCompetition> {
    return encounter.getDrawCompetition();
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

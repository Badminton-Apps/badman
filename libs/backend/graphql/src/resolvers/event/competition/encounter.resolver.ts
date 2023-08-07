import {
  Assembly,
  Comment,
  DrawCompetition,
  EncounterChange,
  EncounterCompetition,
  Game,
  Location,
  Team,
} from '@badman/backend-database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Int,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEncounterCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterCompetition])
  rows?: EncounterCompetition[];
}

@Resolver(() => EncounterCompetition)
export class EncounterCompetitionResolver {


  @Query(() => EncounterCompetition)
  async encounterCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EncounterCompetition> {
    const encounterCompetition = await EncounterCompetition.findByPk(id);

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

  @ResolveField(() => Location)
  async location(@Parent() encounter: EncounterCompetition): Promise<Location> {
    return encounter.getLocation();
  }

  @ResolveField(() => Team)
  async home(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getHome();
  }

  @ResolveField(() => Team)
  async away(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getAway();
  }

  @ResolveField(() => [Assembly])
  async assemblies(
    @Parent() encounter: EncounterCompetition,
    @Args() listArgs: ListArgs
  ): Promise<Assembly[]> {
    return encounter.getAssemblies(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterChange)
  async encounterChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<EncounterChange> {
    return encounter.getEncounterChange();
  }

  @ResolveField(() => [Game])
  async games(@Parent() encounter: EncounterCompetition): Promise<Game[]> {
    return encounter.getGames();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeComments(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayComments(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeCommentsChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayCommentsChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  // @Mutation(returns => Boolean)
  // async removeEncounterCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

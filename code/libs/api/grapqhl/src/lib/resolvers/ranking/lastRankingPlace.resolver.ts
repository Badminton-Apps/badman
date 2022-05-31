import { LastRankingPlace, RankingSystem } from '@badman/api/database';
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
import { ListArgs } from '../../utils';

@ObjectType()
export class PagedLastRankingPlace {
  @Field()
  count: number;

  @Field(() => [LastRankingPlace])
  rows: LastRankingPlace[];
}

@Resolver(() => LastRankingPlace)
export class LastRankingPlaceResolver {
  @Query(() => LastRankingPlace)
  async lastRankingPlace(
    @Args('id', { type: () => ID }) id: string
  ): Promise<LastRankingPlace> {
    let lastRankingPlace = await LastRankingPlace.findByPk(id);

    if (!lastRankingPlace) {
      lastRankingPlace = await LastRankingPlace.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!lastRankingPlace) {
      throw new NotFoundException(id);
    }
    return lastRankingPlace;
  }

  @Query(() => [LastRankingPlace])
  async lastRankingPlaces(
    @Args() listArgs: ListArgs
  ): Promise<LastRankingPlace[]> {
    return LastRankingPlace.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => RankingSystem)
  async rankingSystem(
    @Parent() rankingPlace: LastRankingPlace
  ): Promise<RankingSystem> {
    return rankingPlace.getRankingSystem();
  }

  // @Mutation(returns => LastRankingPlace)
  // async LastRankingPlace(
  //   @Args('LastRankingPlaceData') LastRankingPlaceData: LastRankingPlaceInput,
  // ): Promise<LastRankingPlace> {
  //   const recipe = await this.recipesService.create(LastRankingPlaceData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async LastRankingPlace(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

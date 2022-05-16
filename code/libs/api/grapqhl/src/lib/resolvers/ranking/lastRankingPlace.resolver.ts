import { LastRankingPlace } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../utils';

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
    return LastRankingPlace.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
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

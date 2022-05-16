import { RankingPlace } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => RankingPlace)
export class RankingPlaceResolver {
  @Query(() => RankingPlace)
  async rankingPlace(
    @Args('id', { type: () => ID }) id: string
  ): Promise<RankingPlace> {
    let rankingPlace = await RankingPlace.findByPk(id);

    if (!rankingPlace) {
      rankingPlace = await RankingPlace.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!rankingPlace) {
      throw new NotFoundException(id);
    }
    return rankingPlace;
  }

  @Query(() => [RankingPlace])
  async rankingPlaces(@Args() listArgs: ListArgs): Promise<RankingPlace[]> {
    return RankingPlace.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  // @Mutation(returns => RankingPlace)
  // async RankingPlace(
  //   @Args('RankingPlaceData') RankingPlaceData: RankingPlaceInput,
  // ): Promise<RankingPlace> {
  //   const recipe = await this.recipesService.create(RankingPlaceData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async RankingPlace(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

import { RankingPlace, RankingSystem } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../utils';

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
    return RankingPlace.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => RankingSystem)
  async rankingSystem(@Parent() rankingPlace: RankingPlace): Promise<RankingSystem> {
    return rankingPlace.getRankingSystem();
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

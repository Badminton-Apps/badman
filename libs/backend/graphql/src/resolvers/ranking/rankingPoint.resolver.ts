import { Player, RankingPoint, RankingSystem } from '@badman/backend-database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';

@Resolver(() => RankingPoint)
export class RankingPointResolver {
  @Query(() => RankingPoint)
  async rankingPoint(@Args('id', { type: () => ID }) id: string): Promise<RankingPoint> {
    let rankingPoint = await RankingPoint.findByPk(id);

    if (!rankingPoint) {
      rankingPoint = await RankingPoint.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!rankingPoint) {
      throw new NotFoundException(id);
    }
    return rankingPoint;
  }

  @Query(() => [RankingPoint])
  async rankingPoints(@Args() listArgs: ListArgs): Promise<RankingPoint[]> {
    return RankingPoint.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => Player)
  async player(@Parent() rankingPoint: RankingPoint): Promise<Player> {
    return rankingPoint.getPlayer();
  }

  @ResolveField(() => RankingSystem)
  async system(@Parent() rankingPoint: RankingPoint): Promise<RankingSystem> {
    return rankingPoint.getSystem();
  }

  // @Mutation(returns => RankingPoint)
  // async RankingPoint(
  //   @Args('RankingPointData') RankingPointData: RankingPointInput,
  // ): Promise<RankingPoint> {
  //   const recipe = await this.recipesService.create(RankingPointData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async RankingPoint(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

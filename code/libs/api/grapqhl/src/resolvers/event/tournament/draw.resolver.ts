import { DrawTournament, SubEventTournament } from '@badman/api/database';
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

@Resolver(() => DrawTournament)
export class DrawTournamentResolver {
  @Query(() => DrawTournament)
  async drawTournament(
    @Args('id', { type: () => ID }) id: string
  ): Promise<DrawTournament> {
    let draw = await DrawTournament.findByPk(id);

    if (!draw) {
      draw = await DrawTournament.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!draw) {
      throw new NotFoundException(id);
    }
    return draw;
  }

  @Query(() => [DrawTournament])
  async drawTournaments(@Args() listArgs: ListArgs): Promise<DrawTournament[]> {
    return DrawTournament.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => SubEventTournament)
  async subEventTournament(
    @Parent() draw: DrawTournament
  ): Promise<SubEventTournament> {
    return draw.getSubEvent();
  }

  // @Mutation(returns => DrawTournament)
  // async addDrawTournament(
  //   @Args('newDrawTournamentData') newDrawTournamentData: NewDrawTournamentInput,
  // ): Promise<DrawTournament> {
  //   const recipe = await this.recipesService.create(newDrawTournamentData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeDrawTournament(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

import { GqlGuard } from '@badman/api/authorization';
import { Game, Player, RankingPoint } from '@badman/api/database';
import { NotFoundException, UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { User } from '../../decorators';
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => Game)
export class GamesResolver {
  @Query(() => Game)
  async game(@Args('id', { type: () => ID }) id: string): Promise<Game> {
    let game = await Game.findByPk(id);

    if (!game) {
      game = await Game.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!game) {
      throw new NotFoundException(id);
    }
    return game;
  }

  @Query(() => Game)
  @UseGuards(GqlGuard)
  async me(@User() user: Game): Promise<Game> {
    return user;
  }

  @Query(() => [Game])
  async games(@Args() listArgs: ListArgs): Promise<Game[]> {
    return Game.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  @ResolveField(() => [RankingPoint])
  async rankingPoints(
    @Parent() game: Game,
    @Args() listArgs: ListArgs
  ): Promise<RankingPoint[]> {
    return game.getRankingPoints({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  @ResolveField(() => [Player])
  async teams(@Parent() game: Game): Promise<Player[]> {
    return game.getPlayers();
  }
}

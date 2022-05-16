import { GqlGuard } from '@badman/api/authorization';
import {
  Club,
  Game,
  LastRankingPlace,
  Player,
  Team,
} from '@badman/api/database';
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

@Resolver(() => Player)
export class PlayersResolver {
  @Query(() => Player)
  async player(@Args('id', { type: () => ID }) id: string): Promise<Player> {
    let player = await Player.findByPk(id);

    if (!player) {
      player = await Player.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!player) {
      throw new NotFoundException(id);
    }
    return player;
  }

  @Query(() => Player)
  @UseGuards(GqlGuard)
  async me(@User() user: Player): Promise<Player> {
    return user;
  }

  @Query(() => [Player])
  async players(@Args() listArgs: ListArgs): Promise<Player[]> {
    return Player.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  @ResolveField(() => [LastRankingPlace])
  async lastRankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<LastRankingPlace[]> {
    return player.getLastRankingPlaces({
      limit: listArgs.take,
      offset: listArgs.skip,
      order: [['rank', 'DESC']],
      where: queryFixer(listArgs.where),
    });
  }

  @ResolveField(() => [Game])
  async games(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<Game[]> {
    return player.getGames({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  @ResolveField(() => [Team])
  async teams(
    @Parent() player: Player,
    @Args('includeDisabled', { nullable: true }) disabled?: boolean
  ): Promise<Team[]> {
    return player.getTeams({
      where: {
        active: disabled === undefined ? true : undefined,
      },
    });
  }

  @ResolveField(() => [Club])
  async clubs(@Parent() player: Player): Promise<Club[]> {
    return player.getClubs();
  }

  // @ResolveField(() => [String])
  // async claims(@Parent() player: Player): Promise<string[]> {
  //   return player.getUserClaims();
  // }

  // @Mutation(returns => Player)
  // async addPlayer(
  //   @Args('newPlayerData') newPlayerData: NewPlayerInput,
  // ): Promise<Player> {
  //   const recipe = await this.recipesService.create(newPlayerData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removePlayer(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}

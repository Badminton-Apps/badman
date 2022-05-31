import { GqlGuard } from '@badman/api/authorization';
import {
  Claim,
  Club,
  Game,
  GamePlayer,
  GamePlayers,
  LastRankingPlace,
  Player,
  RankingPlace,
  Team,
  TeamPlayer,
} from '@badman/api/database';
import { Logger, NotFoundException, UseGuards } from '@nestjs/common';
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
import { logger } from 'elastic-apm-node';
import { Op } from 'sequelize';
import { User } from '../../decorators';
import { ListArgs, queryFixer, WhereArgs } from '../../utils';

@ObjectType()
export class PagedPlayer {
  @Field()
  count: number;

  @Field(() => [Player])
  rows: Player[];
}

@Resolver(() => TeamPlayer)
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

  @Query(() => PagedPlayer)
  async players(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: Player[] }> {
    return Player.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Claim])
  async claims(@Parent() player: Player): Promise<Claim[]> {
    return player.getClaims();
  }

  @ResolveField(() => [LastRankingPlace])
  async lastRankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<LastRankingPlace[]> {
    return player.getLastRankingPlaces({
      order: [['rankingDate', 'DESC']],
      ...ListArgs.toFindOptions(listArgs),
    });
  }

  @ResolveField(() => [Game])
  async games(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<Game[]> {
    return player.getGames(ListArgs.toFindOptions(listArgs));
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

@Resolver(() => GamePlayers)
export class GamePlayersResolver extends PlayersResolver {
  @ResolveField(() => RankingPlace)
  async rankingPlace(
    @Parent() player: Player & { GamePlayer: GamePlayer },
    @Args() listArgs: WhereArgs
  ): Promise<RankingPlace> {
    const game = await Game.findByPk(player.GamePlayer.gameId, {
      attributes: ['playedAt'],
    });

    const places = await RankingPlace.findAll({
      where: {
        ...queryFixer(listArgs.where),
        playerId: player.id,
        rankingDate: { [Op.lte]: game.playedAt },
      },
      order: [['rankingDate', 'DESC']],
      limit: 1,
    });

    return places[0];
  }
}

@Resolver(() => TeamPlayer)
export class TeamPlayerResolver extends PlayersResolver {
  @ResolveField(() => [LastRankingPlace])
  async lastRankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<LastRankingPlace[]> {
    const args = ListArgs.toFindOptions(listArgs);

    args.where = {
      ...args.where,
      playerId: player.id,
    };

    return await LastRankingPlace.findAll(args);
  }
}

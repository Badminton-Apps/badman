import {
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayer,
  GamePlayers,
  Player,
  RankingPlace,
  RankingPoint,
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

@Resolver(() => Game)
@Resolver(() => GamePlayer)
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

  @Query(() => [Game])
  async games(@Args() listArgs: ListArgs): Promise<Game[]> {
    return Game.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [RankingPoint])
  async rankingPoints(
    @Parent() game: Game,
    @Args() listArgs: ListArgs
  ): Promise<RankingPoint[]> {
    return game.getRankingPoints(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterCompetition)
  async competition(@Parent() game: Game): Promise<EncounterCompetition> {
    if (game.linkType == 'competition') {
      return game.getCompetition();
    }
  }

  @ResolveField(() => DrawTournament)
  async tournament(@Parent() game: Game): Promise<DrawTournament> {
    if (game.linkType == 'tournament') {
      return game.getTournament();
    }
  }

  @ResolveField(() => [Player])
  async players(@Parent() game: Game): Promise<(Player & GamePlayer)[][]> {
    const players = await game.getPlayers();

    return players?.map((gamePlayer: Player & { GamePlayer: GamePlayer }) => {
      return {
        ...gamePlayer.GamePlayer.toJSON(),
        ...gamePlayer.toJSON(),
      };
    });
  }
}

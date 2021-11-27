import { Game, GamePlayer, Player, RankingPlace } from '@badvlasim/shared/models';
import { GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Identifier, Op } from 'sequelize';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { RankingPlaceType } from './rankingPlace.type';

const GamePlayerType = new GraphQLObjectType({
  name: 'GamePlayer',
  description: 'A Player that is from a game',
  fields: () =>
    Object.assign(getAttributeFields(Player), getAttributeFields(GamePlayer), {
      rankingPlace: {
        type: RankingPlaceType,
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Player.associations.rankingPlaces, {
          before: async (
            findOptions: { [key: string]: object | number },
            _args: unknown,
            _context: unknown,
            info: { source: { GamePlayer: { gameId: Identifier } } }
          ) => {
            const game = await Game.findByPk(info.source.GamePlayer.gameId, {
              attributes: ['playedAt']
            });

            findOptions.where = {
              ...queryFixer(findOptions.where),
              rankingDate: { [Op.lte]: game.playedAt }
            };
            findOptions.order = [['rankingDate', 'DESC']];
            findOptions.limit = 1;
            return findOptions;
          },
          after: (results: RankingPlace[]) => {
            return results[0];
          }
        })
      }
    })
});

export { GamePlayerType };

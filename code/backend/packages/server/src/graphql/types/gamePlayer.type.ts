import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import { attributeFields, createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { col, fn, Includeable, Op, or, QueryTypes, where } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Game, GamePlayer, Player } from '@badvlasim/shared/models';
import { RankingPlaceType } from './rankingPlace.type';
import { getAttributeFields } from './attributes.type';
import { queryFixer } from '../queryFixer';

const GamePlayerType = new GraphQLObjectType({
  name: 'GamePlayer',
  description: 'A Player that is from a game',
  fields: () =>
    Object.assign(getAttributeFields(Player), getAttributeFields(GamePlayer), {
      rankingPlace: {
        type: RankingPlaceType,
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Player.associations.rankingPlaces, {
          before: async (findOptions, args, context, info) => {
            const game = await Game.findByPk(info.source.GamePlayer.gameId, {
              attributes: ['playedAt']
            });

            findOptions.where = {
              ...queryFixer(findOptions.where),
              rankingDate: { [Op.lte]: game.playedAt }
              // rankingDate: '2019-12-13 00:00:00+01'
            };
            findOptions.order = [['rankingDate', 'DESC']];
            findOptions.limit = 1;
            return findOptions;
          },
          after: (results, args) => {
            return results[0];
          }
        })
      }
    })
});

export { GamePlayerType };

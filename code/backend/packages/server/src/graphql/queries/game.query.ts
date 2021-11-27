import { GraphQLList, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Game } from '@badvlasim/shared/models';
import { GameType } from '../types/game.type';
import { queryFixer } from '../queryFixer';

export const gamesQuery = {
  type: new GraphQLList(GameType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(Game, {
    before: async (findOptions, args, context, info) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};
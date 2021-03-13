import { GraphQLList, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Game } from '@badvlasim/shared/models';
import { GameType } from '../types/game.type';

export const gamesQuery = {
  type: new GraphQLList(GameType),
  args: Object.assign(defaultListArgs(), {
    direction: {
      type: GraphQLString
    }
  }),
  resolve: resolver(Game, {
    before: async (findOptions, args, context, info) => {
      if (args.order && args.direction) {
        findOptions = {
          ...findOptions,
          order: [
            [args.order, args.direction],
            ['id', 'desc']
          ]
        };
      }
      return findOptions;
    }
  })
};

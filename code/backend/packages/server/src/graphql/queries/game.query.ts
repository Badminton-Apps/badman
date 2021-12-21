import { GraphQLList } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Game } from '@badvlasim/shared';
import { GameType } from '../types/game.type';
import { queryFixer } from '../queryFixer';

export const gamesQuery = {
  type: new GraphQLList(GameType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(Game, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};
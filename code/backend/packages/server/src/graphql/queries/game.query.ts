import { Game } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { GameType } from '../types/game.type';

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

export const gameQuery = {
  type: GameType,
  args: {
    id: {
      description: 'Id of the location',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(Game)
};
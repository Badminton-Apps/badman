import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Player } from '@badvlasim/shared';
import { PlayerType } from '../types/player.type';
import { queryFixer } from '../queryFixer';

const playerQuery = {
  type: PlayerType,
  args: {
    id: {
      description: 'id of the user',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(Player, {
    before: async (findOptions: { [key: string]: unknown }) => {
      if (findOptions.where?.['id']) {
        findOptions.where = {
          $or: [{ id: findOptions.where?.['id'] }, { slug: findOptions.where?.['id'] }]
        };
      }

      findOptions = {
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

const playersQuery = {
  type: new GraphQLList(PlayerType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(Player, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export { playerQuery, playersQuery };

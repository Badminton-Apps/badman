import { GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { col, fn, Op, or, where } from 'sequelize';
import { Player } from '@badvlasim/shared/models';
import { PlayerType } from '../types/player.type';

const playerQuery = {
  type: PlayerType,
  args: {
    id: {
      description: 'id of the user',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(Player, {
    before: async (findOptions, args, context, info) => {
      return findOptions;
    }
  })
};

const playersQuery = {
  type: new GraphQLList(PlayerType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(Player)
};

export { playerQuery, playersQuery };

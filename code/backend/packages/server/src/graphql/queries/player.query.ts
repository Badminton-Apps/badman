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
      // info.cacheControl.setCacheHint({ maxAge: 6000, scope: 'PRIVATE' });
      return findOptions;
    }
  })
};
const playersQuery = {
  type: new GraphQLList(PlayerType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(Player)
};
const playerSearchQuery = {
  type: new GraphQLList(PlayerType),
  args: {
    query: {
      description: 'Fuzzy-matched name of user',
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  resolve: resolver(Player, {
    // Custom `where` clause that fuzzy-matches user's name and
    // alphabetical sort by username
    before: (findOptions, args) => {
      const parts = args.query
        .toLowerCase()
        .replace(/[;\\\\/:*?\"<>|&',]/, ' ')
        .split(' ');
      const queries = [];
      for (const part of parts) {
        queries.push(
          or(
            where(fn('lower', col('firstName')), {
              [Op.like]: `%${part}%`
            }),

            where(fn('lower', col('lastName')), {
              [Op.like]: `%${part}%`
            }),

            where(fn('lower', col('memberId')), {
              [Op.like]: `%${part}%`
            })
          )
        );
      }
      findOptions.where = {
        [Op.and]: queries
      };

      return findOptions;
    }
  })
};

export { playerQuery, playerSearchQuery, playersQuery };

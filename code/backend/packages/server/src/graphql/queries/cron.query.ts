import { Cron } from '@badvlasim/shared';
import { GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { CronType } from '../types';

export const cronsQuery = {
  type: new GraphQLList(CronType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(Cron, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const cronQuery = {
  type: CronType,
  args: {
    id: {
      description: 'Id of the Cron',
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  resolve: resolver(Cron)
};

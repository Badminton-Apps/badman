import { EncounterChange } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { EncounterChangeType } from '../types';

export const encounterChangeQuery = {
  type: EncounterChangeType,
  args: {
    id: {
      description: 'id of the event competition',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(EncounterChange)
};

export const encounterChangesQuery = {
  type: new GraphQLList(EncounterChangeType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(EncounterChange, {
    before: async (findOptions, args, context, info) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

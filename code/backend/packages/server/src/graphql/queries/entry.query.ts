import { EventEntry } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { EntryType } from '../types/entry.type';

export const entriesQuery = {
  type: new GraphQLList(EntryType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(EventEntry, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const entryQuery = {
  type: EntryType,
  args: {
    id: {
      description: 'Id of the location',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(EventEntry)
};
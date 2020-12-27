import { GraphQLList } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Club } from '@badvlasim/shared/models';
import { ClubType } from '../types/club.type';

const clubsQuery = {
  type: new GraphQLList(ClubType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(Club)
};

export { clubsQuery };

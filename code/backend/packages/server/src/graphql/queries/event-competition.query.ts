import { EventCompetition } from '@badvlasim/shared';
import { GraphQLID, GraphQLNonNull } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { EventCompetitionConnectionType, EventCompetitionType } from '../types/competition';
import { where } from './utils';

export const eventCompetitionQuery = {
  type: EventCompetitionType,
  args: {
    id: {
      description: 'id of the event competition',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(EventCompetition)
};

export const eventCompetitionsQuery = {
  type: EventCompetitionConnectionType.connectionType,
  args: {
    ...EventCompetitionConnectionType.connectionArgs,
    where
  },
  resolve: (...args) => {
    return EventCompetitionConnectionType.resolve(...args);
  }
};

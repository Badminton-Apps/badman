import { EventTournament } from '@badvlasim/shared';
import { GraphQLID, GraphQLNonNull } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { EventTournamentConnectionType, EventTournamentType } from '../types/tournaments';
import { where } from './utils';

export const eventTournamentQuery = {
  type: EventTournamentType,
  args: {
    id: {
      description: 'id of the event tournament',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(EventTournament)
};

export const eventTournamentsQuery = {
  type: EventTournamentConnectionType.connectionType,
  args: {
    ...EventTournamentConnectionType.connectionArgs,
    where
  },
  resolve: (...args) => {
    return EventTournamentConnectionType.resolve(...args);
  }
};

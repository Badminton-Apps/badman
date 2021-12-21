import { EncounterCompetition } from '@badvlasim/shared';
import { GraphQLID, GraphQLNonNull } from 'graphql';
import { resolver } from 'graphql-sequelize';
import {
  EncounterCompetitionInputConnectionType,
  EncounterCompetitionType
} from '../types/competition/encounter-competition.type';
import { where } from './utils';

export const encounterCompetitionQuery = {
  type: EncounterCompetitionType,
  args: {
    id: {
      description: 'id of the encounter',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(EncounterCompetition)
};

export const encounterCompetitionsQuery = {
  type: EncounterCompetitionInputConnectionType.connectionType,
  args: {
    ...EncounterCompetitionInputConnectionType.connectionArgs,
    where,
    team: {
      description: 'id of the team',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: (...args) => EncounterCompetitionInputConnectionType.resolve(...args)
};

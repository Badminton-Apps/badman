import { GraphQLEnumType, GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { EncounterCompetition } from '@badvlasim/shared/models';
import { where } from './utils';
import {
  EncounterCompetitionInputConnectionType,
  EncounterCompetitionType
} from '../types/competition/encounter-competition.type';
import { queryFixer } from '../queryFixer';
import { Op } from 'sequelize';

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
  resolve: (...args: any) => EncounterCompetitionInputConnectionType.resolve(...args)
};

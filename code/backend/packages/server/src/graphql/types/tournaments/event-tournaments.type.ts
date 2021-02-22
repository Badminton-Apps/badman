import { EventTournament } from '@badvlasim/shared';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType
} from 'graphql';
import { attributeFields, createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../../queryFixer';
import { getAttributeFields } from '../attributes.type';
import { SubEventTournamentInputType, SubEventTournamentType } from './subEvent-tournaments.type';

export const EventTournamentType = new GraphQLObjectType({
  name: 'EventTournament',
  description: 'A EventTournament',
  fields: () =>
    Object.assign(getAttributeFields(EventTournament), {
      subEvents: {
        type: new GraphQLList(SubEventTournamentType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(EventTournament.associations.subEvents)
      }
    })
});

export const EventTournamentInputType = new GraphQLInputObjectType({
  name: 'EventTournamentInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(getAttributeFields(EventTournament, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }), {
      subEvents: {
        type: new GraphQLList(SubEventTournamentInputType)
      }
    })
});

export const EventTournamentConnectionType = createConnection({
  name: 'EventTournament',
  nodeType: EventTournamentType,
  target: EventTournament,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  orderBy: new GraphQLEnumType({
    name: 'EventTournamentOrderBy',
    values: {
      DATE_ASC: { value: ['firstDay', 'ASC'] }, // The first ENUM value will be the default order. The direction will be used for `first`, will automatically be inversed for `last` lookups.
      DATE_DESC: { value: ['firstDay', 'DESC'] }
    }
  }),
  where: (key, value, currentWhere) => {
    if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});

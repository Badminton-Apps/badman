import { Event } from '@badvlasim/shared';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType
} from 'graphql';
import { createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { QueryTypes } from 'sequelize';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { SubEventType } from './subEvent.type';

const EventCountsType = new GraphQLObjectType({
  name: 'EventCounts',
  description: 'Counts of events',
  fields: {
    totalGames: {
      type: GraphQLInt
    }
  }
});

export const EventType = new GraphQLObjectType({
  name: 'Event',
  description: 'A Event',
  fields: () =>
    Object.assign(getAttributeFields(Event), {
      subEvents: {
        type: new GraphQLList(SubEventType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Event.associations.subEvents)
      },
      counts: {
        type: EventCountsType,
        resolve: async (source: Event, args, context, info) => {
          // TODO: Check this
          const query = await source.sequelize.query(
            `SELECT "SubEvent"."id", COUNT("games"."id") AS "gamesCount" FROM "SubEvents" AS "SubEvent" LEFT OUTER JOIN "Games" AS "games" ON "SubEvent"."id" = "games"."SubEventId" WHERE "SubEvent"."EventId" = ${source.id} GROUP BY "SubEvent"."id";`,
            {
              type: QueryTypes.SELECT
            }
          );
          return {
            totalGames: query.reduce((acc, val: any) => acc + parseInt(val.gamesCount, 10), 0)
          };
        }
      }
    })
});

export const EventInputType = new GraphQLInputObjectType({
  name: 'EventInput',
  description: 'This represents a UserInputType',
  fields: () => Object.assign(getAttributeFields(Event, true))
});

export const EventConnectionType = createConnection({
  name: 'Event',
  nodeType: EventType,
  target: Event,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  orderBy: new GraphQLEnumType({
    name: 'EventOrderBy',
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

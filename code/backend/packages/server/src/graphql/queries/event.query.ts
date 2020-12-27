import { GraphQLEnumType, GraphQLID, GraphQLNonNull } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { Event } from '@badvlasim/shared/models';
import { EventConnectionType, EventType } from '../types/event.type';
import { ImportedConnectionType } from '../types/imported.type';
import { where } from './utils';

const eventQuery = {
  type: EventType,
  args: {
    id: {
      description: 'id of the event',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(Event)
};

const eventsQuery = {
  type: EventConnectionType.connectionType,
  args: {
    ...EventConnectionType.connectionArgs,
    where,
    type: {
      type: new GraphQLEnumType({
        name: 'EventType',
        values: {
          TOERNAMENT: { value: 'TOERNAMENT' },
          COMPETITION: { value: 'COMPETITION' }
        }
      })
    }
  },
  resolve: (...args) => {
    return EventConnectionType.resolve(...args);
  }
};
const importedQuery = {
  type: ImportedConnectionType.connectionType,
  args: {
    ...ImportedConnectionType.connectionArgs,
    where
  },
  resolve: (...args) => ImportedConnectionType.resolve(...args)
};

export { eventQuery, eventsQuery, importedQuery };

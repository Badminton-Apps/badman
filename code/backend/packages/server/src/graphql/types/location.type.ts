import { EventCompetitionType } from './competition/event-competition.type';
import { Location } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { ClubType } from '.';
import { getAttributeFields } from './attributes.type';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { EventTournamentType } from './tournaments';

export const LocationType = new GraphQLObjectType({
  name: 'Location',
  description: 'A Location',
  fields: () => Object.assign(getAttributeFields(Location), {
    club: {
      type: new GraphQLList(ClubType),
      args: Object.assign(defaultListArgs(), {}),
      resolve: resolver(Location.associations.club)
    },
    eventCompetitions: {
      type: new GraphQLList(EventCompetitionType),
      args: Object.assign(defaultListArgs(), {}),
      resolve: resolver(Location.associations.eventCompetitions)
    },
    eventTournaments: {
      type: new GraphQLList(EventTournamentType),
      args: Object.assign(defaultListArgs(), {}),
      resolve: resolver(Location.associations.eventTournaments)
    }
  })
});

export const LocationInputType = new GraphQLInputObjectType({
  name: 'LocationInput',
  description: 'This represents a LocationInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Location, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] })
    )
});

import { Availability } from '@badvlasim/shared';
import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { resolver } from 'graphql-sequelize';
import GraphqlDate from 'graphql-sequelize/lib/types/dateType';

import { getAttributeFields } from './attributes.type';
import { LocationType } from './location.type';

export const AvailabilityType = new GraphQLObjectType({
  name: 'Availability',
  description: 'A Availability',
  fields: () =>
    Object.assign(getAttributeFields(Availability), {
      location: {
        type: LocationType,
        resolve: resolver(Availability.associations.location, {})
      },
      days: {
        type: new GraphQLList(AvailiblyDayType),
        resolve: (availability: Availability) => {
          return availability.days;
        }
      },
      exceptions: {
        type: new GraphQLList(AvailabilityExceptionType),
        resolve: (availability: Availability) => {
          return availability.exceptions;
        }
      }
    })
});

export const AvailabilityInputType = new GraphQLInputObjectType({
  name: 'AvailabilityInput',
  description: 'This represents a AvailabilityInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Availability, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      }),
      {
        days: {
          type: new GraphQLList(AvailiblyDayInputType)
        },
        exceptions: {
          type: new GraphQLList(AvailabilityExceptionInputType)
        }
      }
    )
});

const AvailiblyDayType = new GraphQLObjectType({
  name: 'AvailiblyDay',
  description: 'AvailiblyDay',
  fields: () => {
    return availabilityDayFields;
  }
});

const AvailabilityExceptionType = new GraphQLObjectType({
  name: 'AvailabilityException',
  description: 'AvailabilityException',
  fields: () => {
    return availabilityExceptionFields;
  }
});

const AvailiblyDayInputType = new GraphQLInputObjectType({
  name: 'AvailiblyDayInput',
  description: 'AvailiblyDay',
  fields: () => {
    return availabilityDayFields;
  }
});

const AvailabilityExceptionInputType = new GraphQLInputObjectType({
  name: 'AvailabilityExceptionInput',
  description: 'AvailabilityException',
  fields: () => {
    return availabilityExceptionFields;
  }
});

const availabilityDayFields = {
  day: {
    type: GraphQLString
  },
  startTime: {
    type: GraphQLString
  },
  endTime: {
    type: GraphQLString
  },
  courts: {
    type: GraphQLInt
  }
};

const availabilityExceptionFields = {
  start: {
    type: GraphqlDate
  },
  end: {
    type: GraphqlDate
  },
  courts: {
    type: GraphQLInt
  }
};

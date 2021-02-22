import { SubEventTournament } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { attributeFields, resolver } from 'graphql-sequelize';
import { getAttributeFields } from '../attributes.type';
import { RankingSystemGroupInputType } from '../rankingSystemGroup.type';
import { DrawTournamentType } from './draw-tournaments.type';
import { EventTournamentType } from './event-tournaments.type';

export const SubEventTournamentType = new GraphQLObjectType({
  name: 'SubEventTournament',
  description: 'A SubEventTournament',
  fields: () =>
    Object.assign(getAttributeFields(SubEventTournament), {
      draws: {
        type: new GraphQLList(DrawTournamentType),
        resolve: resolver(SubEventTournament.associations.draws)
      },
      event: {
        type: EventTournamentType,
        resolve: resolver(SubEventTournament.associations.event)
      }
    })
});

export const SubEventTournamentInputType = new GraphQLInputObjectType({
  name: 'SubEventTournamentInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(SubEventTournament, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }),
      {
        groups: {
          type: new GraphQLList(RankingSystemGroupInputType)
        }
      }
    )
});

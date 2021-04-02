import { TeamType } from './../team.type';
import { SubEventCompetition } from '@badvlasim/shared/models';
import { GraphQLBoolean, GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { resolver, attributeFields } from 'graphql-sequelize';
import { getAttributeFields } from '../attributes.type';
import { RankingSystemGroupInputType } from '../rankingSystemGroup.type';
import { DrawCompetitionType } from './draw-competition.type';
import { EventCompetitionType } from './event-competition.type';

const SubEventCompetitionType = new GraphQLObjectType({
  name: 'SubEventCompetition',
  description: 'A SubEventCompetition',
  fields: () =>
    Object.assign(getAttributeFields(SubEventCompetition), {
      draws: {
        type: new GraphQLList(DrawCompetitionType),
        resolve: resolver(SubEventCompetition.associations.draws)
      },
      event: {
        type: EventCompetitionType,
        resolve: resolver(SubEventCompetition.associations.event)
      },
      teams: {
        type: new GraphQLList(SubEventCompetitionType),
        resolve: resolver(SubEventCompetition.associations.teams)
      }
    })
});

const SubEventCompetitionInputType = new GraphQLInputObjectType({
  name: 'SubEventCompetitionInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(SubEventCompetition, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      }),
      {
        groups: {
          type: new GraphQLList(RankingSystemGroupInputType)
        }
      }
    )
});

export { SubEventCompetitionType, SubEventCompetitionInputType };

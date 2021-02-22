import { DrawCompetition } from '@badvlasim/shared/models';
import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from 'graphql';
import { attributeFields, defaultListArgs, resolver } from 'graphql-sequelize';
import { getAttributeFields } from '../attributes.type';
import { GameType } from '../game.type';
import { RankingSystemGroupInputType } from '../rankingSystemGroup.type';
import { SubEventCompetitionType } from './subEvent-competition.type';

const DrawCompetitionType = new GraphQLObjectType({
  name: 'DrawCompetition',
  description: 'A DrawCompetition',
  fields: () =>
    Object.assign(getAttributeFields(DrawCompetition), {
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs(), {
          playerId: {
            description: 'id of the user',
            type: new GraphQLNonNull(GraphQLID)
          }
        }),
        resolve: resolver(DrawCompetition.associations.games)
      },
      gamesCount: {
        type: GraphQLInt,
        resolve: async (source: DrawCompetition, args, context, info) => {
          return context.models.Game.count({
            where: { drawId: source.id, drawType: 'competition' }
          });
        }
      },
      subEvent: {
        type: SubEventCompetitionType,
        resolve: resolver(DrawCompetition.associations.subEvent)
      }
    })
});

const DrawCompetitionInputType = new GraphQLInputObjectType({
  name: 'DrawCompetitionInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(DrawCompetition, {
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

export { DrawCompetitionType, DrawCompetitionInputType };

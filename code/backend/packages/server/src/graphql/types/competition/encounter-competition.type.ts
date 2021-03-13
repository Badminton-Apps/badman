import { EncounterCompetition } from '@badvlasim/shared/models';
import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { getAttributeFields } from '../attributes.type';
import { GameType } from '../game.type';
import { RankingSystemGroupInputType } from '../rankingSystemGroup.type';
import { DrawCompetitionType } from './draw-competition.type';

const EncounterCompetitionType = new GraphQLObjectType({
  name: 'EncounterCompetition',
  description: 'A EncounterCompetition',
  fields: () =>
    Object.assign(getAttributeFields(EncounterCompetition), {
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs(), {
          playerId: {
            description: 'id of the user',
            type: new GraphQLNonNull(GraphQLID)
          }
        }),
        resolve: resolver(EncounterCompetition.associations.games)
      },
      gamesCount: {
        type: GraphQLInt,
        resolve: async (source: EncounterCompetition, args, context, info) => {
          return context.models.Game.count({
            where: { drawId: source.id, drawType: 'competition' }
          });
        }
      },
      draw: {
        type: DrawCompetitionType,
        resolve: resolver(EncounterCompetition.associations.draw)
      }
    })
});

const EncounterCompetitionInputType = new GraphQLInputObjectType({
  name: 'EncounterCompetitionInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(EncounterCompetition, {
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

export { EncounterCompetitionType, EncounterCompetitionInputType };

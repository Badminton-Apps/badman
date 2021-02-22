import { DrawTournament } from '@badvlasim/shared';
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
import { SubEventTournamentType } from './subEvent-tournaments.type';

const DrawTournamentType = new GraphQLObjectType({
  name: 'DrawTournament',
  description: 'A DrawTournament',
  fields: () =>
    Object.assign(getAttributeFields(DrawTournament), {
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs(), {
          playerId: {
            description: 'id of the user',
            type: new GraphQLNonNull(GraphQLID)
          }
        }),
        resolve: resolver(DrawTournament.associations.games, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          }
        })
      },
      gamesCount: {
        type: GraphQLInt,
        resolve: async (source: DrawTournament, args, context, info) => {
          return context.models.Game.count({
            where: { DrawTournamentId: source.id }
          });
        }
      },
      subEvent: {
        type: SubEventTournamentType,
        resolve: resolver(DrawTournament.associations.subEvent)
      }
    })
});

const DrawTournamentInputType = new GraphQLInputObjectType({
  name: 'DrawTournamentInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(getAttributeFields(DrawTournament, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }), {
      groups: {
        type: new GraphQLList(RankingSystemGroupInputType)
      }
    })
});

export { DrawTournamentType, DrawTournamentInputType };

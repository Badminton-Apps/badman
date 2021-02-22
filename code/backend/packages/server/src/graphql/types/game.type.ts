import { GraphQLList, GraphQLObjectType } from 'graphql';
import { attributeFields, resolver } from 'graphql-sequelize';
import { Game } from '@badvlasim/shared/models';
import { GamePlayerType } from './gamePlayer.type';
import { getAttributeFields } from './attributes.type';
import { DrawCompetitionType } from './competition';
import { DrawTournamentType } from './tournaments';

const GameType = new GraphQLObjectType({
  name: 'Game',
  description: 'A Game',
  fields: () =>
    Object.assign(getAttributeFields(Game), {
      players: {
        type: new GraphQLList(GamePlayerType),
        resolve: resolver(Game.associations.players, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          },
          after: (result, args, context) => {
            return result.map(player => {
              player.team = player.getDataValue('GamePlayer').team;
              player.player = player.getDataValue('GamePlayer').player;
              return player;
            });
          }
        })
      }, 
      drawCompetition: {
        type: DrawCompetitionType,
        resolve: resolver(Game.associations.drawCompetition)
      },
      drawTournament: {
        type: DrawTournamentType,
        resolve: resolver(Game.associations.drawTournament)
      }
    })
});

export { GameType };

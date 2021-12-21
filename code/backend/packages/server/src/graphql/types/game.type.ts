import { Game, GamePlayer, Player } from '@badvlasim/shared';
import { GraphQLList, GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { EncounterCompetitionType } from './competition/encounter-competition.type';
import { GamePlayerType } from './gamePlayer.type';
import { RankingPointType } from './rankingPoint.type';
import { DrawTournamentType } from './tournaments';

export const GameType = new GraphQLObjectType({
  name: 'Game',
  description: 'A Game',
  fields: () =>
    Object.assign(getAttributeFields(Game), {
      players: {
        type: new GraphQLList(GamePlayerType),
        resolve: resolver(Game.associations.players, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          },
          after: (result: (Player & GamePlayer)[]) => {
            return result.map(player => {
              player.team = player.getDataValue('GamePlayer').team;
              player.player = player.getDataValue('GamePlayer').player;
              return player;
            });
          }
        })
      },

      rankingPoints: {
        type: new GraphQLList(RankingPointType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Game.associations.rankingPoints, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      tournament: {
        type: DrawTournamentType,
        resolve: resolver(Game.associations.tournament)
      },
      competition: {
        type: EncounterCompetitionType,
        resolve: resolver(Game.associations.competition)
      }
    })
});

import { Club, ClubMembership, Player, RankingSystem } from '@badvlasim/shared';
import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { ClubType } from '.';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { GameType } from './game.type';
import { LastRankingPlaceType, RankingPlaceType } from './rankingPlace.type';
import { RankingPointType } from './rankingPoint.type';
import { ClaimType } from './security/claim.type';
import { TeamType } from './team.type';

export const PlayerType = new GraphQLObjectType({
  name: 'Player',
  description: 'A Player',
  fields: () =>
    Object.assign(getAttributeFields(Player), {
      teams: {
        type: new GraphQLList(TeamType),
        resolve: resolver(Player.associations.teams)
      },
      claims: {
        type: new GraphQLList(ClaimType),
        resolve: resolver(Player.associations.claims)
      },
      rankingPlaces: {
        type: new GraphQLList(RankingPlaceType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Player.associations.rankingPlaces, {
          before: async (findOptions: { [key: string]: object }, args) => {
            findOptions.where = {
              ...queryFixer(findOptions.where)
            };
            findOptions.order = [args.order ?? ['rankingDate', 'DESC']];
            findOptions.limit = args.limit;
            return findOptions;
          }
        })
      }, 
      lastRanking: {
        type: LastRankingPlaceType,
        args: Object.assign({
          system: {
            type: GraphQLString
          }
        }),
        resolve: async (obj: Player, args: { system: string }) => {
          let systemId = args.system;
          if (systemId == null) {
            systemId = (await RankingSystem.findOne({ where: { primary: true } })).id;
          }

          if (systemId == null) {
            return null;
          }

          const places = await obj.getLastRankingPlaces({
            where: { systemId },
            order: [['rankingDate', 'DESC']]
          });
          return places?.[0];
        }
      },
      rankingPoints: {
        type: new GraphQLList(RankingPointType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Player.associations.rankingPoints, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Player.associations.games, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      base: {
        type: GraphQLBoolean
      },
      club: {
        description: 'The current club of the player',
        type: ClubType,
        resolve: async (obj: Player) => {
          // Todo, do this via associations
          const memberShip = await ClubMembership.findOne({
            where: { end: null, playerId: obj.id }
          });

          return Club.findByPk(memberShip?.clubId);
        }
      },
      clubs: {
        description: 'All the club the player has been a part of',
        type: new GraphQLList(ClubType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Player.associations.clubs, {
          before: async (findOptions: { [key: string]: object | boolean }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          },
          after: (results: (Club & { clubMembership: ClubMembership })[]) => {
            return results.map((result) => {
              result.clubMembership = result.getDataValue('ClubMembership');
              return result;
            });
          }
        })
      }
    })
});

export const PlayerInputType = new GraphQLInputObjectType({
  name: 'PlayerInput',
  description: 'This represents a PlayerInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Player, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] })
    )
});

import { logger } from '@badvlasim/shared';
import { Club, Player, RankingSystem } from '@badvlasim/shared/models';
import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Op } from 'sequelize';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { ClubType } from './club.type';
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
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Player.associations.rankingPlaces, {
          before: async (findOptions, args, context, info) => {
            findOptions.where = {
              ...queryFixer(findOptions.where)
            };
            findOptions.order =
              args.order && args.direction
                ? [[args.order, args.direction]]
                : [['rankingDate', 'DESC']];
            findOptions.limit = args.limit;
            return findOptions;
          }
        })
      },
      lastRanking: {
        type: LastRankingPlaceType,
        args: Object.assign(defaultListArgs(), {
          system: {
            type: GraphQLString
          }
        }),
        resolve: async (obj: Player, args, context, info) => {
          let systemId = args.system;
          if (systemId == null) {
            systemId = (await RankingSystem.findOne({ where: { primary: true } })).id;
          }

          if (systemId == null) {
            return null;
          }

          const places = await obj.getLastRankingPlaces({ where: { systemId } });
          return places[0];
        }
      },
      rankingPoints: {
        type: new GraphQLList(RankingPointType),
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Player.associations.rankingPoints, {
          before: async (findOptions, args, context, info) => {
            if (args.order && args.direction) {
              findOptions = {
                ...findOptions,
                where: queryFixer(findOptions.where),
                order: [[args.order, args.direction]]
              };
            }
            return findOptions;
          }
        })
      },
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Player.associations.games, {
          before: async (findOptions, args, context, info) => {
            if (args.order && args.direction) {
              findOptions = {
                ...findOptions,
                where: queryFixer(findOptions.where),
                order: [
                  [args.order, args.direction],
                  ['id', 'desc']
                ]
              };
            }
            return findOptions;
          }
        })
      },
      base: {
        type: GraphQLBoolean
      },
      clubs: {
        type: new GraphQLList(ClubType),
        args: Object.assign(defaultListArgs(), {
          end: {
            type: GraphQLString
          }
        }),

        resolve: async (obj: Player, args, context, info) => {
          const where = {
            end: undefined
          };

          if (!args.end) {
            where.end = null;
          } else {
            where.end = {
              [Op.gte]: args.end
            };
          }

          args.where = queryFixer(args.where);

          const player = await Player.findOne({
            attributes: ['id'],
            where: { id: obj.id },
            include: [{ model: Club, through: { where } }]
          });
          return player?.clubs;
        }
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

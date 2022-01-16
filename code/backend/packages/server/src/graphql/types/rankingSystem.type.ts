import { LastRankingPlace, Player, RankingPlace, RankingSystem } from '@badvlasim/shared';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { createConnection, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { Includeable, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { where } from '../queries/utils';
import { getAttributeFields } from './attributes.type';
import { CountsResultType, RankingPlacesResult } from './rankingPlayerResult.type';
import { RankingSystemGroupInputType, RankingSystemGroupType } from './rankingSystemGroup.type';
import { PlayerType } from './player.type';

export const RankingSystemType = new GraphQLObjectType({
  name: 'RankingSystem',
  description: 'A RankingSystem',
  fields: () =>
    Object.assign(getAttributeFields(RankingSystem), {
      counts: {
        type: CountsResultType,
        args: {
          gender: {
            description: 'Gender',
            type: GraphQLString
          }
        },
        resolve: async (source: RankingSystem, args: { [key: string]: object }) => {
          const sharedWhere = {
            SystemId: source.id
          };
          const sharedInclude: Includeable[] = [];

          if (args.gender) {
            sharedInclude.push({
              model: Player,
              where: { gender: args.gender },
              attributes: []
            });
          }

          const singleCount = await RankingPlace.findAll({
            group: ['rankingDate', 'single'],
            attributes: ['rankingDate', [Sequelize.fn('COUNT', 'single'), 'count'], 'single'],
            raw: true,
            where: {
              singlePoints: {
                [Op.gt]: 0
              },
              ...sharedWhere
            },
            order: ['rankingDate', 'single'],
            include: sharedInclude
          });

          const single = singleCount.reduce(
            (acc: RankingPlacesResult[], value: RankingPlace & { count: number }) => {
              const existing = acc.find((x) => x.date.toString() === value.rankingDate.toString());

              if (existing) {
                existing.points.push({
                  level: value.single,
                  amount: value.count
                });
              } else {
                acc.push({
                  date: value.rankingDate,
                  points: [
                    {
                      level: value.single,
                      amount: value.count
                    }
                  ]
                });
              }

              return acc;
            },
            []
          );
          const doubleCount = await RankingPlace.findAll({
            group: ['rankingDate', 'double'],
            attributes: ['rankingDate', [Sequelize.fn('COUNT', 'double'), 'count'], 'double'],
            raw: true,
            where: {
              doublePoints: {
                [Op.gt]: 0
              },
              ...sharedWhere
            },
            order: ['rankingDate', 'double'],
            include: sharedInclude
          });

          const double = doubleCount.reduce(
            (acc: RankingPlacesResult[], value: RankingPlace & { count: number }) => {
              const existing = acc.find((x) => x.date.toString() === value.rankingDate.toString());

              if (existing) {
                existing.points.push({
                  level: value.double,
                  amount: value.count
                });
              } else {
                acc.push({
                  date: value.rankingDate,
                  points: [
                    {
                      level: value.double,
                      amount: value.count
                    }
                  ]
                });
              }

              return acc;
            },
            []
          );
          const mixCount = await RankingPlace.findAll({
            group: ['rankingDate', 'mix'],
            attributes: ['rankingDate', [Sequelize.fn('COUNT', 'mix'), 'count'], 'mix'],
            raw: true,
            where: {
              mixPoints: {
                [Op.gt]: 0
              },
              ...sharedWhere
            },
            order: ['rankingDate', 'mix'],
            include: sharedInclude
          });

          const mix = mixCount.reduce(
            (acc: RankingPlacesResult[], value: RankingPlace & { count: number }) => {
              const existing = acc.find((x) => x.date.toString() === value.rankingDate.toString());

              if (existing) {
                existing.points.push({
                  level: value.mix,
                  amount: value.count
                });
              } else {
                acc.push({
                  date: value.rankingDate,
                  points: [
                    {
                      level: value.mix,
                      amount: value.count
                    }
                  ]
                });
              }

              return acc;
            },
            []
          );

          return {
            single,
            double,
            mix
          };
        }
      },
      groups: {
        type: new GraphQLList(RankingSystemGroupType),
        resolve: resolver(RankingSystem.associations.groups)
      },
      pointsToGoUp: {
        type: new GraphQLList(GraphQLInt)
      },
      pointsWhenWinningAgainst: {
        type: new GraphQLList(GraphQLInt)
      },
      pointsToGoDown: {
        type: new GraphQLList(GraphQLInt)
      },
      places: {
        args: { ...RankingPlaceConnectionType.connectionArgs, where },
        type: RankingPlaceConnectionType.connectionType,
        resolve: RankingPlaceConnectionType.resolve
      },
      lastPlaces: {
        args: { ...LastRankingPlaceConnectionType.connectionArgs, where },
        type: LastRankingPlaceConnectionType.connectionType,
        resolve: LastRankingPlaceConnectionType.resolve
      }
    })
});

// TODO: replace this with dynamic ordering
const RankingOrderBy = new GraphQLEnumType({
  name: 'RankingOrderBy',
  values: {
    singleRank: { value: ['singleRank', 'ASC'] },
    doubleRank: { value: ['doubleRank', 'ASC'] },
    mixRank: { value: ['mixRank', 'ASC'] },
    reverse_singleRank: { value: ['singleRank', 'DESC'] },
    reverse_doubleRank: { value: ['doubleRank', 'DESC'] },
    reverse_mixRank: { value: ['mixRank', 'DESC'] }
  }
});

export const RankingPlaceOutputType = new GraphQLObjectType({
  name: 'RankingPlaceOutput',
  description: 'A 2nd RankingPlace',
  fields: () =>
    Object.assign(getAttributeFields(RankingPlace), {
      player: {
        type: PlayerType,
        resolve: resolver(RankingPlace.associations.player)
      }
    })
});

export const RankingPlaceConnectionType = createConnection({
  name: 'RankingPlace',
  nodeType: RankingPlaceOutputType,
  target: () => RankingSystem.associations.places,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  orderBy: RankingOrderBy,
  where: (key: string, value: unknown) => {
    if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});

export const LastRankingPlaceOutputType = new GraphQLObjectType({
  name: 'LastRankingPlaceOutput',
  description: 'A 2nd LastRankingPlace',
  fields: () =>
    Object.assign(getAttributeFields(LastRankingPlace), {
      player: {
        type: PlayerType,
        resolve: resolver(LastRankingPlace.associations.player)
      }
    })
});

export const LastRankingPlaceConnectionType = createConnection({
  name: 'LastRankingPlace',
  nodeType: LastRankingPlaceOutputType,
  target: () => RankingSystem.associations.lastPlaces,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  orderBy: RankingOrderBy,
  where: (key: string, value: unknown) => {
    if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});

export const RankingSystemInputType = new GraphQLInputObjectType({
  name: 'RankingSystemInput',
  description: 'This represents a RankingSystemGroupInput',
  fields: () =>
    Object.assign(
      getAttributeFields(RankingSystem, {
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

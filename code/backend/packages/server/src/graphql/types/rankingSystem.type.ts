import { Player, RankingPlace, RankingSystem } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { Includeable, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { getAttributeFields } from './attributes.type';
import { CountsResultType, RankingPlacesResult } from './rankingPlayerResult.type';
import { RankingSystemGroupInputType, RankingSystemGroupType } from './rankingSystemGroup.type';

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
        resolve: async (source: RankingSystem, args, context, info) => {
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

          const single = singleCount.reduce((acc: RankingPlacesResult[], value: any) => {
            const existing = acc.find(x => x.date.toString() === value.rankingDate.toString());

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
          }, []);
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

          const double = doubleCount.reduce((acc: RankingPlacesResult[], value: any) => {
            const existing = acc.find(x => x.date.toString() === value.rankingDate.toString());

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
          }, []);
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

          const mix = mixCount.reduce((acc: RankingPlacesResult[], value: any) => {
            const existing = acc.find(x => x.date.toString() === value.rankingDate.toString());

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
          }, []);

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
      }
    })
});


export const RankingSystemInputType = new GraphQLInputObjectType({
  name: 'RankingSystemInput',
  description: 'This represents a RankingSystemGroupInput',
  fields: () =>
    Object.assign(getAttributeFields(RankingSystem, true), {
      groups: {
        type: new GraphQLList(RankingSystemGroupInputType)
      }
    })
});

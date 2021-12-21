import { LastRankingPlace, RankingPlace } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { PlayerType } from './player.type';
import { RankingSystemType } from './rankingSystem.type';

export const RankingPlaceType = new GraphQLObjectType({
  name: 'RankingPlace',
  description: 'A RankingPlace',
  fields: () =>
    Object.assign(getAttributeFields(RankingPlace), {
      rankingSystem: {
        type: RankingSystemType,
        resolve: resolver(RankingPlace.associations.rankingSystem)
      },
      player: {
        type: new GraphQLNonNull(PlayerType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingPlace.associations.player, {
          before: async (
            findOptions: { [key: string]: object }
          ) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      }
    })
});

export const RankingPlaceInputType = new GraphQLInputObjectType({
  name: 'RankingPlaceInput',
  description: 'This represents a RankingPlaceInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(RankingPlace, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      })
    )
});

export const LastRankingPlaceType = new GraphQLObjectType({
  name: 'LastRankingPlace',
  description: 'A LastRankingPlace',
  fields: () =>
    Object.assign(getAttributeFields(LastRankingPlace), {
      rankingSystem: {
        type: RankingSystemType,
        resolve: resolver(LastRankingPlace.associations.rankingSystem)
      },
      player: {
        type: new GraphQLNonNull(PlayerType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(LastRankingPlace.associations.player, {
          before: async (
            findOptions: { [key: string]: object }
          ) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      }
    })
});

export const LastRankingPlaceInputType = new GraphQLInputObjectType({
  name: 'LastRankingPlaceInput',
  description: 'This represents a LastRankingPlaceInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(LastRankingPlace, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      })
    )
});

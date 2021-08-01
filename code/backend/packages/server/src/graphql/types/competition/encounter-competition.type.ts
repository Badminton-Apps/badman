import { EncounterCompetition } from '@badvlasim/shared/models';
import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from 'graphql';
import { createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { Op } from 'sequelize';
import { queryFixer } from '../../queryFixer';
import { getAttributeFields } from '../attributes.type';
import { GameType } from '../game.type';
import { RankingSystemGroupInputType } from '../rankingSystemGroup.type';
import { TeamType } from '../team.type';
import { EncounterChangeType } from './change-encounter/change-encounter.type';
import { DrawCompetitionType } from './draw-competition.type';

export const EncounterCompetitionType = new GraphQLObjectType({
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
        resolve: resolver(EncounterCompetition.associations.games, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
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
      },
      home: {
        type: TeamType,
        resolve: resolver(EncounterCompetition.associations.home)
      },
      away: {
        type: TeamType,
        resolve: resolver(EncounterCompetition.associations.away)
      },
      encounterChange: {
        type: EncounterChangeType,
        resolve: resolver(EncounterCompetition.associations.encounterChange)
      }
    })
});

export const EncounterCompetitionInputType = new GraphQLInputObjectType({
  name: 'EncounterCompetitionInput',
  description: 'This represents a EncounterCompetitionInput',
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

export const EncounterCompetitionInputConnectionType = createConnection({
  name: 'EncounterCompetition',
  nodeType: EncounterCompetitionType,
  target: EncounterCompetition,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  where: (key, value, currentWhere) => {
    if (key === 'team') {
      return { [Op.or]: [{ homeTeamId: value }, { awayTeamId: value }] };
    } else if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});

import { Team } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { getAttributeFields } from './attributes.type';
import { PlayerType } from './player.type';

export const TeamType = new GraphQLObjectType({
  name: 'Team',
  description: 'A Team',
  fields: () =>
    Object.assign(getAttributeFields(Team), {
      players: {
        type: new GraphQLList(PlayerType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Team.associations.players)
      }
    })
});

export const TeamInputType = new GraphQLInputObjectType({
  name: 'TeamInput',
  description: 'This represents a TeamnputType',
  fields: () => Object.assign(getAttributeFields(Team, true))
});

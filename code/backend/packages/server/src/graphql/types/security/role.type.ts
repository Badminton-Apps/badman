import { Role } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { getAttributeFields } from '../attributes.type';
import { ClubType } from '../club.type';
import { PlayerType } from '../player.type';
import { ClaimInputType, ClaimType } from './claim.type';

export const RoleType = new GraphQLObjectType({
  name: 'Role',
  description: 'A Role',
  fields: () =>
    Object.assign(getAttributeFields(Role), {
      club: {
        type: new GraphQLList(ClubType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Role.associations.club)
      },
      claims: {
        type: new GraphQLList(ClaimType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Role.associations.claims)
      },
      players: {
        type: new GraphQLList(PlayerType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Role.associations.players)
      }
    })
});

export const RoleInputType = new GraphQLInputObjectType({
  name: 'RoleInput',
  description: 'This represents a RolenputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Role, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }),
      {
        claims: {
          type: new GraphQLList(ClaimInputType)
        }
      }
    )
});

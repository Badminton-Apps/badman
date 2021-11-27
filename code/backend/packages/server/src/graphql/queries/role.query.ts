import { Role } from '@badvlasim/shared/models';
import { GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { RoleType } from '../types/security/role.type';

export const rolesQuery = {
  type: new GraphQLList(RoleType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(Role, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const roleQuery = {
  type: RoleType,
  args: {
    id: {
      description: 'Id of the role',
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  resolve: resolver(Role)
};

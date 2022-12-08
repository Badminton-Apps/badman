import { Player } from '@badman/backend-database';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const User = createParamDecorator(
  async (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user;

    // console.log('data', ctx.getContext().req);
    // If we have a user in the request, return it
    if (user && user.sub) {
      return user;
    }
    // If we don't have a user in the request, set the permissions to return false;
    return {
      ...user,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
    };
  }
);

export interface LoggedInUser extends Player {
  context: {
    iss: string;
    sub: string;
    aud: string[];
    iat: number;
    exp: number;
    azp: string;
    scope: string;
  };
}

import { Player } from '@badman/api/database';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const User = createParamDecorator(
  async (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const requestUser = ctx.getContext().req.user;
    const user = await Player.findOne({ where: { sub: requestUser.sub } });

    // If we have a user append the context
    if (user) {
      user['context'] = requestUser;
      return user;
    } else {
      // If we don't have a user, just return the context
      return {
        context: requestUser,
      }
    }

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

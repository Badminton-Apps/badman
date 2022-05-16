import { Player } from '@badman/api/database';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';


export const User = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const user =  ctx.getContext().req.user;
    return Player.findOne({ where: { sub: user.sub } });
  },
);
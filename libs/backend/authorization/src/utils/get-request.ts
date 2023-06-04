import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export function getRequest(context: ExecutionContext) {
  // might be a GqlExecutionContext
  const ctx = GqlExecutionContext.create(context);
  const { req } = ctx.getContext();

  if (req) {
    return req;
  }

  return context.switchToHttp().getRequest();
}

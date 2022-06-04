import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard as Passport } from '@nestjs/passport';

@Injectable()
export class PermGuard extends Passport('jwt') {
  // Override handleRequest so it never throws an error
  handleRequest(err, user) {
    return user;
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

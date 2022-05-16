import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GqlGuard extends AuthGuard('jwt') {
  // constructor(
  //   @Optional() protected readonly options: AuthModuleOptions,
  //   private readonly reflector: Reflector
  // ) {
  //   super(options);
  // }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

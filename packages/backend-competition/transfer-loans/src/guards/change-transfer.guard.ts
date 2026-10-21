import { Player } from "@badman/backend-database";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

/** Requires a logged-in user with `change:transfer`; `request.user` is set by the global PermGuard. */
@Injectable()
export class ChangeTransferGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const user: Player | undefined = ctx.switchToHttp().getRequest().user;
    if (!user?.id) {
      throw new UnauthorizedException("Login required");
    }
    if (!(await user.hasAnyPermission(["change:transfer"]))) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}

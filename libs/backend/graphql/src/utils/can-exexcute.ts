import { Player } from '@badman/backend-database';
import { Logger, UnauthorizedException } from '@nestjs/common';

export const canExecute = async (
  user: Player,
  permissions?: {
    anyPermissions?: string[];
    allPermissions?: string[];
  },
  message?: string
) => {
  if ((user ?? null) === null) {
    throw new UnauthorizedException({
      code: 401,
      message: message ?? 'Not authenticated',
    });
  }

  if (permissions?.anyPermissions && permissions?.anyPermissions.length > 0) {
    if (!await user.hasAnyPermission(permissions.anyPermissions)) {
      Logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: permissions.anyPermissions,
        },
        received: user?.permissions,
      });
      throw new UnauthorizedException({
        code: 401,
        message: message ?? "You don't have permission to do this",
      });
    }
  }

  if (permissions?.allPermissions && permissions?.allPermissions.length > 0) {
    if (!await user.hasAllPermission(permissions.allPermissions)) {
      Logger.warn("User tried something it should't have done", {
        required: {
          allClaim: permissions.allPermissions,
        },
        received: user?.permissions,
      });
      throw new UnauthorizedException({
        code: 401,
        message: message ?? "You don't have permission to do this",
      });
    }
  }
};

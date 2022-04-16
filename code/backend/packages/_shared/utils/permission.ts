import { AuthenticatedUser } from '../services';
import { ApiError } from './api.error';
import { logger } from './logger';

/**
 * Checks if a user is logged in and when persmissions are added checks if the user has the given permission.
 *
 * @param user Checks if the user is logged
 * @param permissions The permissions to check
 * @param errorMessage The error message to show if the user is not logged in or does not have the permission
 */
export const canExecute = (
  user: AuthenticatedUser,
  permissions?: {
    anyPermissions?: string[];
    allPermissions?: string[];
  },
  message?: string
) => {
  if ((user ?? null) === null) {
    throw new ApiError({ code: 401, message: message ?? 'Not authenticated' });
  }

  if (permissions?.anyPermissions && permissions?.anyPermissions.length > 0) {
    if (!user.hasAnyPermission(permissions.anyPermissions)) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: permissions.anyPermissions,
        },
        received: user?.permissions,
      });
      throw new ApiError({
        code: 401,
        message: message ?? "You don't have permission to do this",
      });
    }
  }

  if (permissions?.allPermissions && permissions?.allPermissions.length > 0) {
    if (!user.hasAllPermission(permissions.allPermissions)) {
      logger.warn("User tried something it should't have done", {
        required: {
          allClaim: permissions.allPermissions,
        },
        received: user?.permissions,
      });
      throw new ApiError({
        code: 401,
        message: message ?? "You don't have permission to do this",
      });
    }
  }
};

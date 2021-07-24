import { NextFunction, Request, Response } from 'express';
import jwt from 'express-jwt';
import jwks from 'jwks-rsa';
import get from 'axios';
import { logger } from '@badvlasim/shared';
import { Player } from '../../models';

export class AuthenticationSercice {
  static subCache = new Map();
  static playerCache = new Map();
  static permissionCache = new Map();
  checkAuth = null;

  constructor() {
    this.checkAuth = [
      jwt({
        secret: jwks.expressJwtSecret({
          cache: true,
          jwksUri: `${process.env.AUTH0_ISSUER}/.well-known/jwks.json`
        }),
        audience: 'ranking-simulation',
        issuer: `${process.env.AUTH0_ISSUER}/`,
        algorithms: ['RS256']
      }),
      this.getUserInfo.bind(this)
    ];
  }

  public async getUserInfo(
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction
  ) {
    let player = null;
    let permissions = [];

    let userinfo = AuthenticationSercice.subCache.get(request.user?.sub);

    if (!userinfo && request?.headers?.authorization) {
      userinfo = await get(`${process.env.AUTH0_ISSUER}/userinfo`, {
        headers: { authorization: request.headers.authorization }
      });
      AuthenticationSercice.subCache.set(request.user.sub, userinfo);
    }

    if (userinfo) {
      player = AuthenticationSercice.playerCache.get(request.user.sub);

      if (!player) {
        player = await Player.findOne({ where: { sub: request.user.sub } });
        AuthenticationSercice.playerCache.set(request.user.sub, player);
      }

      if (player) {
        permissions = AuthenticationSercice.permissionCache.get(player?.id);


        if (!permissions) {
          permissions = await player?.getUserClaims();
          AuthenticationSercice.permissionCache.set(player.id, permissions);
        }
      }
    }

    // extend info
    request.user = {
      ...request.user,
      ...userinfo?.data,
      player,
      permissions,
      hasAnyPermission: (requiredPermissions: string[]) => {
        if (request?.user?.permissions == null) {
          return false;
        }

        return requiredPermissions.some(perm =>
          request.user.permissions.includes(perm)
        );
      },
      hasAllPermission: (requiredPermissions: string[]) => {
        if (request?.user?.permissions == null) {
          return false;
        }

        return requiredPermissions.every(perm =>
          request.user.permissions.includes(perm)
        );
      }
    };

    next();
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface AuthenticatedUser {
  player: Player;
  sub: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  given_name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  updated_at: Date;
  email: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  email_verified: boolean;
  permissions: string[];
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermission: (permissions: string[]) => boolean;
}

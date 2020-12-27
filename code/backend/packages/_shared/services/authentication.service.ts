import { NextFunction, Request, Response } from 'express';
import jwt from 'express-jwt';
import jwks from 'jwks-rsa';
import get from 'axios';
import { logger } from '@badvlasim/shared';

export class AuthenticationSercice {
  cache = new Map();
  checkAuth = null;

  constructor() {
    // Kinda risky, but works
    if (process.env.production === 'false') {
      this.checkAuth = [
        (
          request: AuthenticatedRequest,
          response: Response,
          next: NextFunction
        ) => {
          request.user = {
            ...request.user,
            nickname: 'Test',
            hasAnyPermission: (permissions: string[]) => {
              logger.debug(`running in dev, so DO EVERYTHING :)`);
              return true;
            },
            hasAllPermission: (permissions: string[]) => {
              logger.debug(`running in dev, so DO EVERYTHING :)`);
              return true;
            }
          };

          next();
        }
      ];
      return;
    }

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
    try {
      let userinfo = this.cache.get(request.user.sub);
      if (!this.cache.get(request.user.sub)) {
        userinfo = await get(`${process.env.AUTH0_ISSUER}/userinfo`, {
          headers: { authorization: request.headers.authorization }
        });
        this.cache.set(request.user.sub, userinfo);
      }

      // extend info
      request.user = {
        ...request.user,
        ...userinfo.data,
        hasAnyPermission: (permissions: string[]) => {
          if (request?.user?.permissions == null) {
            return false;
          }

          return permissions.some(perm =>
            request.user.permissions.includes(perm)
          );
        },
        hasAllPermission: (permissions: string[]) => {
          if (request?.user?.permissions == null) {
            return false;
          }

          return permissions.every(perm =>
            request.user.permissions.includes(perm)
          );
        }
      };

      next();
    } catch (e) {
      logger.error('Something went wrong getting the info from Auh0', e);
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface AuthenticatedUser {
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

import { Player } from '@badman/backend-database';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { ALLOW_ANONYMOUS_META_KEY } from './anonymous.decorator';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class PermGuard implements CanActivate {
  private readonly _logger = new Logger(PermGuard.name);
  private readonly jwksClient: JwksClient;

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService
  ) {
    this.jwksClient = new JwksClient({
      cache: true,
      jwksUri: `${this.configService.get(
        'AUTH0_ISSUER_URL'
      )}/.well-known/jwks.json`,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANONYMOUS_META_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic) {
      // 💡 See this condition
      return true;
    }

    const request = this.getRequest(context);

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return true;
    }

    try {
      const payload = await this.validateToken(token);

      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = await this.validateUser(payload);
    } catch (e) {
      this._logger.error('Invalid token', e);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request?.headers?.['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  async validateUser(payload: { sub?: string }) {
    if (payload.sub) {
      try {
        const user = await Player.findOne({
          where: { sub: payload.sub },
        });
        if (user) {
          return user;
        }
      } catch (e) {
        this._logger.error(e);
      }
    }
    return payload;
  }

  async validateToken(token: string) {
    try {
      const publicKey = await this.getPublicKey();
      const payload = this.jwtService.verify(token, {
        algorithms: ['RS256'],
        publicKey,
        audience: this.configService.get('AUTH0_AUDIENCE'),
        issuer: `${this.configService.get('AUTH0_ISSUER_URL')}/`,
      });
      return payload;
    } catch (error) {
      // Handle token validation error
      this._logger.error(`Error fetching token`, error);
    }
  }

  private async getPublicKey(): Promise<string | Buffer> {
    const kid = 'MzAzRUEwRTA3RjNDOENGRjA2Qzk3RUFFMkMzMjczNEY2NTI4RjIyQw';
    const signingKey = await this.jwksClient.getSigningKey(kid);

    return signingKey.getPublicKey();
  }

  private getRequest(context: ExecutionContext) {
    // might be a GqlExecutionContext
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    if (req) {
      return req;
    }

    return context.switchToHttp().getRequest();
  }
}

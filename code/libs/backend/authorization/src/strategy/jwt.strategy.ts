import { Player } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly Logger = new Logger(JwtStrategy.name);
  constructor(configService: ConfigService) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        jwksUri: `${configService.get(
          'AUTH0_ISSUER_URL'
        )}/.well-known/jwks.json`,
      }),

      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: configService.get('AUTH0_AUDIENCE'),
      issuer: `${configService.get('AUTH0_ISSUER_URL')}/`,
      algorithms: ['RS256'],
      credentialsRequired: false,
    });
  }

  async validate(payload: { sub?: string }) {
    if (payload.sub) {

      try {
        const user = await Player.findOne({
          where: { sub: payload.sub },
        });
        if (user) {
          return user;
        }
      } catch (e) {
        this.Logger.error(e);
      }
    }
    return payload;
  }
}

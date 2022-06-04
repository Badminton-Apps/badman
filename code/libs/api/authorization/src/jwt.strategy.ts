import { Player } from '@badman/api/database';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
      const user = await Player.findOne({ where: { sub: payload.sub } });
      if (user) {
        return user;
      }
    }
    return payload
  }
}

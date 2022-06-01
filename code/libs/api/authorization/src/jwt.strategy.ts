import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

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

  validate(payload: unknown): unknown {
    return payload;
  }
}

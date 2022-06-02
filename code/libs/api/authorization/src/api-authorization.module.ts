import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { PermGuard } from './decorators';
import { JwtStrategy } from './jwt.strategy';
@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: PermGuard,
    },
  ],
  exports: [PassportModule],
})
export class ApiAuthorizationModule {}

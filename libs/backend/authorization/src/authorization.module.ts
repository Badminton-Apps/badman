import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PermGuard } from './decorators';
@Module({
  imports: [
    ConfigModule,

    JwtModule.register({
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermGuard,
    },
  ],
  exports: [JwtModule],
})
export class AuthorizationModule {}

import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [HealthController],
  imports: [ ConfigModule, TerminusModule],
})
export class HealthModule {}

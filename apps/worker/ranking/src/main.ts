/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WorkerRankingModule } from './app/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WorkerRankingModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    }
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
}
bootstrap();

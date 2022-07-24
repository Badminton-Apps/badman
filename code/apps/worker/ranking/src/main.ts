/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { WorkerRankingModule } from './app/app.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerRankingModule);
}
bootstrap();

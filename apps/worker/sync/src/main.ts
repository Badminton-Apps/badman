import { WorkerSyncModule } from './app/app.module';

import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WorkerSyncModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    }
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.listen(5001);
}
bootstrap();

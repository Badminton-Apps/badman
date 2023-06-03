import { WorkerSyncModule } from './app/app.module';

import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WorkerSyncModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    }
  );

  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.get('PORT') || 5001;
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  await app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      process.exit(1);
    }
  });
}
bootstrap();

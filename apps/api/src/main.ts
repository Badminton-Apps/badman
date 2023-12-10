/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
// import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app';

import fmp from '@fastify/multipart';
import { RedisIoAdapter } from '@badman/backend-socket';

async function bootstrap() {
  Logger.debug('Starting application');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 10048576,
    }),
    {
      bufferLogs: true,
    },
  );
  const configService = app.get<ConfigService>(ConfigService);
  Logger.debug('Application created');

  app.setGlobalPrefix('api');
  Logger.debug('Set global prefix');

  app.register(fmp as never);
  Logger.debug('multipart registered');

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  Logger.debug('Logger registered');

  app.enableCors({
    origin: function (origin, callback) {
      return callback(null, true);
    },
    optionsSuccessStatus: 200,
    credentials: true,
  });
  Logger.debug('Cors enabled');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  Logger.debug('Versioning enabled');

  const redisHost = configService.get('REDIS_HOST');
  if (redisHost) {
    const redisPass = configService.get('REDIS_PASSWORD');
    const redisIoAdapter = new RedisIoAdapter(app);

    let redisUrl = redisPass ? `redis://:${redisPass}@` : 'redis://';
    redisUrl += `${redisHost}:${configService.get('REDIS_PORT')}`;

    await redisIoAdapter.connectToRedis(redisUrl);

    app.useWebSocketAdapter(redisIoAdapter);
  }

  Logger.debug('Extensions loaded');

  const port = configService.get('PORT') || 5000;
  await app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      process.exit(1);
    }
  });

  Logger.debug(
    `🚀 Application is running on: ${await app.getUrl()}. level: ${configService.get(
      'NODE_ENV',
    )}`,
  );
}

try {
  bootstrap();
} catch (error) {
  Logger.error(error);
}

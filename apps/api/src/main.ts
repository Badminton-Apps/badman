/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app';

import fmp from '@fastify/multipart';
import { RedisIoAdapter } from '@badman/backend-websockets';
import compression from '@fastify/compress';
import RedisMemoryServer from 'redis-memory-server';

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

  if (configService.get<string>('NODE_ENV') === 'test') {
    Logger.verbose(
      `Starting redis memory server for test environment on port ${configService.get('REDIS_PORT') || 6379}`,
    );
    const redisMemoryServer = new RedisMemoryServer({
      instance: {
        port: configService.get('REDIS_PORT') || 6379,
      },
    });

    try {
      await redisMemoryServer.start();
    } catch (error) {
      Logger.error('Error starting redis memory server', error);
      process.exit(1);
    }
  }

  app.setGlobalPrefix('api');
  Logger.debug('Set global prefix');

  await app.register(fmp as never);
  Logger.debug('multipart registered');

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  Logger.debug('Logger registered');

  await app.register(compression as never);

  Logger.debug('Compression enabled');

  app.enableCors({
    origin: function (origin, callback) {
      return callback(null, true);
    },
    credentials: true, 
    optionsSuccessStatus: 200,
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

  const port = configService.get('PORT') || 5010;
  await app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      process.exit(1);
    }
  });

  Logger.debug(
    `🚀 Application is running on: ${await app.getUrl()}. level: ${configService.get('NODE_ENV')}`,
  );
}

try {
  bootstrap();
} catch (error) {
  Logger.error(error);
}

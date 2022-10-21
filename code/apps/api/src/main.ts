/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule, RedisIoAdapter } from './app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const globalPrefix = 'api';
  const configService = app.get<ConfigService>(ConfigService);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const redisHost = configService.get('REDIS_HOST');
  if (redisHost) {
    const redisPass = configService.get('REDIS_PASSWORD');
    const redisIoAdapter = new RedisIoAdapter(app);

    let redisUrl = redisPass ? `redis://:${redisPass}@` : 'redis://';

    redisUrl += `${redisHost}:${configService.get('REDIS_PORT')}`;

    await redisIoAdapter.connectToRedis(redisUrl);

    app.useWebSocketAdapter(redisIoAdapter);
  }

  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: '*',
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = configService.get('PORT') || 5000;
  await app.listen(port);

  Logger.debug(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}. level: ${configService.get(
      'NODE_ENV'
    )}`
  );
}

bootstrap();

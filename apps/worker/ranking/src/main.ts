import { RedisIoAdapter } from '@badman/backend-websockets';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WorkerRankingModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(WorkerRankingModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  const configService = app.get<ConfigService>(ConfigService);

  const redisHost = configService.get('REDIS_HOST');
  if (redisHost) {
    const redisPass = configService.get('REDIS_PASSWORD');
    const redisIoAdapter = new RedisIoAdapter(app);

    let redisUrl = redisPass ? `redis://:${redisPass}@` : 'redis://';

    redisUrl += `${redisHost}:${configService.get('REDIS_PORT')}`;

    await redisIoAdapter.connectToRedis(redisUrl);

    app.useWebSocketAdapter(redisIoAdapter);
  }

  const port = configService.get('PORT') || 5002;
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  await app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      process.exit(1);
    }
  });
}
bootstrap();

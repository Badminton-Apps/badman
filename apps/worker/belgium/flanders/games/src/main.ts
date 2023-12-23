import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';

async function bootstrapPointsService() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        port: 4001,
      },
    },
  );
  await app.listen();

  setTimeout(() => {
    Logger.debug('worker-belgium-flanders-games is ready');
  }, 200);
}
bootstrapPointsService();
// ClusterService.clusterize(bootstrapPointsService, cpus().length);

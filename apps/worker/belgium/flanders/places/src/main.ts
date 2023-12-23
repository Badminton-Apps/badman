import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrapPointsService() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        port: 4002,
      },
    },
  );
  await app.listen();

  setTimeout(() => {
    Logger.debug('worker-belgium-flanders-places is ready');
  }, 200);
}
bootstrapPointsService();
// ClusterService.clusterize(bootstrapPointsService, cpus().length);

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ClusterService } from '@badman/backend-cluster';
import { cpus } from 'node:os';

async function bootstrapPointsService() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        port: 4003,
      },
    },
  );

  await app.listen();

  setTimeout(() => {
    Logger.debug('worker-belgium-flanders-points is ready');
  }, 200);
}

// if on development, bootstrap the service with the cluster
if (process.env.NODE_ENV === 'development') {
  ClusterService.clusterize(bootstrapPointsService, cpus().length);
} else {
  bootstrapPointsService();
}

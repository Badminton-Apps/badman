import { ClusterService } from '@badman/backend-cluster';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { cpus } from 'node:os';
import { AppModule } from './app/app.module';

async function bootstrapPlacessService() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      port: 4002,
    },
  });
  await app.listen();
}

// if on development, bootstrap the service with the cluster
if (process.env.NODE_ENV === 'development') {
  ClusterService.clusterize(bootstrapPlacessService, cpus().length);
} else {
  bootstrapPlacessService();
}

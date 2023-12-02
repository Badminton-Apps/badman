import { ClusterService } from '@badman/backend-cluster';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { cpus } from 'os';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule);
  await app.listen();
}
// bootstrap();
ClusterService.clusterize(bootstrap, cpus().length);

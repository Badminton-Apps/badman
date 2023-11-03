import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ClusterService } from '@badman/backend-cluster';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule);
  await app.listen();
}
// bootstrap();
ClusterService.clusterize(bootstrap, 20);

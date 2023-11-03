import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ClusterService } from '@badman/backend-cluster';

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
}
// bootstrap();
ClusterService.clusterize(bootstrapPointsService, 20);

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ClusterService } from '@badman/backend-cluster';

async function bootstrap() {
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
}
// bootstrap();
ClusterService.clusterize(bootstrap, 20);

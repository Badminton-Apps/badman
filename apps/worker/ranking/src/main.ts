import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { EventEmitter } from 'events';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule);
  await app.listen();

  // set max listeners to 1000
  EventEmitter.defaultMaxListeners = 5000;
}
bootstrap();

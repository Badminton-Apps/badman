/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { ScriptModule } from './app/app.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(ScriptModule);
}
bootstrap();

// write log to file

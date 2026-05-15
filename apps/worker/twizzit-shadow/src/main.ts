import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { WorkerTwizzitShadowModule } from "./app/app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WorkerTwizzitShadowModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    }
  );

  const configService = app.get<ConfigService>(ConfigService);

  const port =
    configService.get("WORKER_TWIZZIT_SHADOW_PORT") ||
    configService.get("PORT") ||
    5006;

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  await app.listen(port, "0.0.0.0", (error) => {
    if (error) {
      process.exit(1);
    }
  });
}

bootstrap();

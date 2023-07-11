import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProvider,
  ClientsModule,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';

interface MicroModuleOptions {
  name: string;
}

@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class MicroModule {
  static register({ name }: MicroModuleOptions): DynamicModule {
    return {
      module: MicroModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name,
            useFactory: (configService: ConfigService) =>
              ({
                transport: Transport.RMQ,
                options: {
                  urls: [configService.get<string>('QUEUE_URI')],
                  queue: configService.get<string>(`_QUEUE_${name}_QUEUE`),
                },
              } as RmqOptions),
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}

import { Module } from '@nestjs/common';
import { EventsGateway } from './events';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class SocketModule {}

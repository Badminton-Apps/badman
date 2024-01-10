import { Module } from '@nestjs/common';
import { EventsGateway } from './events/events.gateway';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class SocketModule {}

import {
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
// implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
export class EventsGateway {
  // private logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  // afterInit() {
  //   this.logger.log('Initialized!');
  // }

  // handleDisconnect(client: Socket) {
  //   this.logger.log(`Client disconnected: ${client.id}`);
  // }

  // handleConnection(client: Socket) {
  //   this.logger.log(`Client connected: ${client.id}`);
  // }
}
 
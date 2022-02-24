import { io } from 'socket.io-client';
import { EVENTS } from './events';
import { logger } from '../utils';

export class SocketListener {
  static async setup(
    subscribers: {
      name: string;
      handler: (data: object) => Promise<void>;
    }[]
  ) {
    logger.info(`Connecting to ${process.env.SOCKET_SERVICE}`);
    const socket = io(process.env.SOCKET_SERVICE, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 20,
    });

    socket.on(EVENTS.CONNECT, () => {
      logger.debug(`Connected to ${process.env.SOCKET_SERVICE}`);

      subscribers.forEach((subscriber) => {
        socket.on(subscriber.name, subscriber.handler);
      });
    });
  }
}

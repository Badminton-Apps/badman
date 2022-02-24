import { logger } from '@badvlasim/shared';
import { Emitter } from '@socket.io/postgres-emitter';
import { Pool } from 'pg';

export class SocketEmitter {
  static emitter: Emitter;

  static async setup() {
    const pool = new Pool({
      host: process.env.DB_IP,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    this.emitter = new Emitter(pool);
    logger.debug('socket.io client initialized');
  }
  

  static emit(event: string, data: unknown) {
    if (this.emitter == null) {
      throw new Error('Socket.io client is not initialized');
    }
    logger.silly(`Emitting event ${event}`, { data });
    return this.emitter.emit(event, data);
  }

}

export interface SocketEvent {
  name: string;
  handler: (data: unknown) => Promise<void>;
}

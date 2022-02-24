import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/postgres-adapter';
import { Pool } from 'pg';

import http from 'http';
import cors from 'cors';
import { logger } from '@badvlasim/shared';

export class SocketServer {
  static io: Server;

  static async setup(server: http.Server, cors: cors.CorsOptions) {
    this.io = new Server(server, { cors });

    const pool = new Pool({
      host: process.env.DB_IP,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS socket_io_attachments (
          id          bigserial UNIQUE,
          created_at  timestamptz DEFAULT NOW(),
          payload     bytea
      );
    `);

    this.io.adapter(createAdapter(pool));
    logger.debug('Socket.io initialized');
  }

  static emit(event: string, data: unknown) {
    if (this.io == null) {
      throw new Error('Socket.io is not initialized');
    }
    logger.debug(`Emitting event ${event}`, { data });
    return this.io.emit(event, data);
  }
}

// First config
import { App } from '@badvlasim/shared';
import dotenv from 'dotenv';
dotenv.config();

const startServer = () => {
  const app = new App(process.env.PORT, []);
  app.listen();
};

(async () => {
  startServer();
})();

import { Sequelize } from 'sequelize-typescript';
import { Dialect, Model } from 'sequelize';
import { slugifyModel } from 'sequelize-slugify';
import * as sequelizeModels from './models';
import {
  Club,
  EventCompetition,
  EventTournament,
  Player,
  Team,
} from './models';

export const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const sequelize = new Sequelize({
        host: process.env.DB_IP,
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        database: process.env.DB_DATABASE,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        dialect: process.env.DB_DIALECT as Dialect,
        logging: false,
      });
      const models = Object.values(sequelizeModels).filter(
        (m) => m.prototype instanceof Model
      );
      sequelize.addModels(models as []);
      initAddons();

      return sequelize;
    },
  },
];

const initAddons = () => {
  // Addons & Plugins
  slugifyModel(Player as unknown as Model, {
    source: ['firstName', 'lastName'],
  });
  slugifyModel(EventCompetition as unknown as Model, {
    source: ['name'],
  });
  slugifyModel(EventTournament as unknown as Model, {
    source: ['name'],
  });
  slugifyModel(Club as unknown as Model, {
    source: ['name'],
  });
  slugifyModel(Team as unknown as Model, {
    source: ['name'],
  });
};

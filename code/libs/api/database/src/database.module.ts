import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { Model, ModelCtor } from 'sequelize-typescript';
import * as sequelizeModels from './models';
import { slugifyModel } from 'sequelize-slugify';
import {
  Club,
  EventCompetition,
  EventTournament,
  Player,
  Team,
} from './models';
import { Dialect } from 'sequelize';
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        let options: SequelizeModuleOptions = {
          models: Object.values(sequelizeModels).filter(
            (m) => m.prototype instanceof Model
          ) as ModelCtor[],
          logging: configService.get('DB_LOGGING') === 'true',
        };

        if (configService.get('DB_DIALECT') === 'postgres') {
          options = {
            ...options,
            dialect: configService.get('DB_DIALECT'),
            host: configService.get('DB_IP'),
            port: +configService.get('DB_PORT'),
            username: configService.get('DB_USER'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
          };
        } else if (configService.get('DB_DIALECT') === 'sqlite') {
          options = {
            ...options,
            dialect: configService.get('DB_DIALECT'),
            storage: configService.get('DB_STORAGE'),
          };
        }

        Logger.log(`DB_DIALECT: ${configService.get('DB_DIALECT')}`);

        return options;
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor() {
    if (process.env.DB_DIALECT as Dialect) {
      require('pg');
    }
  }

  onModuleInit() {
    this.logger.debug('initialize addons');
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
  }
}

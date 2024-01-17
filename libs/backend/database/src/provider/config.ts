import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SequelizeModuleOptions,
  SequelizeOptionsFactory,
} from '@nestjs/sequelize';
import { Model, ModelCtor } from 'sequelize-typescript';
import * as sequelizeModels from '../models';
import { ConfigType } from '@badman/utils';

@Injectable()
export class SequelizeConfigProvider implements SequelizeOptionsFactory {
  private readonly logger = new Logger(SequelizeConfigProvider.name);
  constructor(private readonly configService: ConfigService<ConfigType>) {}

  async createSequelizeOptions(): Promise<SequelizeModuleOptions> {
    const env = this.configService.get<'production' | 'development' | 'test'>(
      'NODE_ENV',
    );

    this.logger.log(`Loading ${env} config`);

    const models = Object.values(sequelizeModels).filter(
      (m) => m.prototype instanceof Model,
    ) as ModelCtor[];

    const logging = this.configService.get<boolean>('DB_LOGGING')
      ? console.log
      : false;

    const dialect = this.configService.get('DB_DIALECT');

    let options: SequelizeModuleOptions = {
      logging,
    };

    if (dialect === 'postgres') {
      require('pg');
      // await import('pg');

      options = {
        ...options,
        dialect,
        host: this.configService.get('DB_IP'),
        port: +this.configService.get('DB_PORT'),
        username: this.configService.get('DB_USER'),
        password: this.configService.get('DB_PASSWORD'),
        database: this.configService.get('DB_DATABASE'),
        ssl: this.configService.get<boolean>('DB_SSL'),

        dialectOptions: {
          ssl: this.configService.get<boolean>('DB_SSL'),
        },
      };
    } else if (!dialect || dialect === 'sqlite') {
      options = {
        ...options,
        dialect: dialect ?? 'sqlite',
        storage: this.configService.get('DB_STORAGE') ?? 'database.sqlite',
      };
    }
    // log the options when in development

    if (env !== 'production') {
      this.logger.debug({
        logging: logging,
        dialect: options.dialect,
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        database: options.database ?? options.storage,
        ssl: options.ssl,
      });
    }

    options.models = models;

    return options;
  }
}

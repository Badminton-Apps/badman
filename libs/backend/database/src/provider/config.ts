import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SequelizeModuleOptions,
  SequelizeOptionsFactory,
} from '@nestjs/sequelize';
import { Model, ModelCtor } from 'sequelize-typescript';
import * as sequelizeModels from '../models';

@Injectable()
export class SequelizeConfigProvider implements SequelizeOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  async createSequelizeOptions(): Promise<SequelizeModuleOptions> {
    const models = Object.values(sequelizeModels).filter(
      (m) => m.prototype instanceof Model
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

    if (process.env.NODE_ENV === 'development') {
      console.log(options);
    }

    options.models = models;

    return options;
  }
}

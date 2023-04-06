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
    const logging = this.configService.get('DB_LOGGING') === 'true';
    const dialect = this.configService.get('DB_DIALECT');

    let options: SequelizeModuleOptions = {
      models,
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
      };
    } else if (!dialect || dialect === 'sqlite') {
      options = {
        ...options,
        dialect: dialect ?? 'sqlite',
        storage: this.configService.get('DB_STORAGE') ?? 'database.sqlite',
      };
    }

    return options;
  }
}

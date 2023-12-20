import { CacheModule } from '@badman/backend-cache';
import { ConfigType } from '@badman/utils';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { slugifyModel } from 'sequelize-slugify';
import { Model } from 'sequelize-typescript';
import {
  Club,
  EventCompetition,
  EventTournament,
  Player,
  Team,
} from './models';
import { SequelizeConfigProvider } from './provider';
import { loadTest } from './_testing/load-test';
import { Sequelize } from 'sequelize-typescript';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useClass: SequelizeConfigProvider,
      inject: [ConfigService],
    }),
    ConfigModule,
    CacheModule,
  ],
  providers: [],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  // get sequelize instance
  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly sequelize: Sequelize,
  ) {}

  async onModuleInit() {
    this.logger.debug('initialize addons');
    slugifyModel(Player as unknown as Model, {
      source: ['firstName', 'lastName', 'memberId'],
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
      source: ['name', 'season'],
    });

    if (this.configService.get('NODE_ENV') === 'test') {
      // initialize test database
      this.logger.log('Initializing test database');
      await this.sequelize.sync({ force: true });

      // load test data
      this.logger.log('Loading test data');
      await loadTest();
    }
  }
}

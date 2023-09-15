import { CacheModule } from '@badman/backend-cache';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { slugifyModel } from 'sequelize-slugify';
import { Model } from 'sequelize-typescript';
import { SequelizeAttachReqToModelMiddleware } from './middleware';
import {
  Club,
  EventCompetition,
  EventTournament,
  Player,
  Team,
} from './models';
import { SequelizeConfigProvider } from './provider';
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
  providers: [SequelizeAttachReqToModelMiddleware],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  onModuleInit() {
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
  }
}

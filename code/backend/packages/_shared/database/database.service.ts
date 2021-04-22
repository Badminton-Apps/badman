import { exec } from 'child_process';
import { CreateOptions } from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import {
  Club,
  ClubMembership,
  DrawCompetition,
  DrawTournament,
  Game,
  GamePlayer,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RequestLink,
  SubEventCompetition,
  SubEventTournament,
  Team,
  TeamPlayerMembership,
  TeamSubEventMembership
} from '../models';
import * as sequelizeModels from '../models/sequelize';
import { logger } from '../utils/logger';
import { splitInChunks } from '../utils/utils';

export class DataBaseHandler {
  static sequelizeInstance: Sequelize;
  private _dialect: string;

  private get _sequelize(): Sequelize {
    if (!DataBaseHandler.sequelizeInstance) {
      throw new Error("Sequelize isn't initialized yet");
    }
    return DataBaseHandler.sequelizeInstance;
  }

  constructor(config: SequelizeOptions) {
    this.setupDb(config);
  }

  setupDb(config: SequelizeOptions) {
    if (!DataBaseHandler.sequelizeInstance) {
      const models = Object.values(sequelizeModels);

      logger.debug('Connecting with ', {
        ...config
      });

      this._dialect = config.dialect;

      DataBaseHandler.sequelizeInstance = new Sequelize({
        ...config, 
        retry: {
          report: (message, configObj) => {
            if (configObj.$current > 5) {
              logger.warn(message);
            }
          }
        },
        models,
        logging:
          process.env.LOG_LEVEL === 'silly' || config.logging
            ? logger.silly.bind(logger)
            : false
      } as SequelizeOptions);
    }
  }

  async cleanUpImport() {
    const transaction = await this._sequelize.transaction();

    await this._disableForeignKeyCheck(transaction);

    const tableToTruncate = [
      GamePlayer.getTableName(),
      ClubMembership.getTableName(),
      TeamPlayerMembership.getTableName(),
      TeamSubEventMembership.getTableName(),
      RankingPlace.getTableName(),
      RankingPoint.getTableName(),
      Team.getTableName(),
      Club.getTableName(),
      Game.getTableName(),
      SubEventCompetition.getTableName(),
      SubEventTournament.getTableName(),
      DrawCompetition.getTableName(),
      DrawTournament.getTableName(),
      RequestLink.getTableName()
    ];

    await this._sequelize.query(
      `TRUNCATE ONLY "${tableToTruncate.join('","')}" RESTART IDENTITY`
    );
    await this._sequelize.query(`DELETE FROM "${Player.getTableName()}"`);

    await this._enableForeignKeyCheck(transaction);
    await transaction.commit();
  }

  async sync(force = false, alter = false) {
    try {
      if (alter) {
        await this._disableForeignKeyCheck();
      }
      await this._sequelize.sync({ force, alter });
      if (alter) {
        await this._enableForeignKeyCheck();
      }
      logger.silly('Synced');
    } catch (err) {
      logger.error('Something went wrong', err);
    }
  }

  private async _disableForeignKeyCheck(transaction?) {
    switch (this._dialect) {
      case 'sqlite':
        break;
      case 'mysql':
        await this._sequelize.query('SET FOREIGN_KEY_CHECKS = 0', {
          raw: true,
          transaction
        });
        break;
      case 'postgres':
        await this._sequelize.query("SET session_replication_role='replica'", {
          raw: true,
          transaction
        });
        break;
    }
  }
  private async _enableForeignKeyCheck(transaction?) {
    switch (this._dialect) {
      case 'sqlite':
        break;
      case 'mysql':
        await this._sequelize.query('SET FOREIGN_KEY_CHECKS = 1', {
          raw: true,
          transaction
        });
        break;
      case 'postgres':
        await this._sequelize.query("SET session_replication_role='origin'", {
          raw: true,
          transaction
        });
        break;
    }
  }


  async addPlayers(
    users: {
      memberId: string;
      firstName: string;
      lastName: string;
      birthDate?: Date;
    }[]
  ) {
    logger.silly(`Importing ${users.length} players`);
    try {
      return await Player.bulkCreate(users, {
        updateOnDuplicate: ['memberId', 'firstName', 'lastName', 'birthDate'],
        returning: ['id']
      });
    } catch (err) {
      logger.error('Something went wrong adding users', err);
      throw err;
    }
  }

  async makeSystemPrimary(id: string) {
    const currentSystems = await RankingSystem.findAll({
      where: { primary: true }
    });
    currentSystems.forEach(system => {
      system.primary = false;
      system.save();
    });

    const newSystem = await RankingSystem.findByPk(id);
    if (newSystem) {
      newSystem.primary = true;
      newSystem.save();
    }
  }

  async createSystem(vaues, options: CreateOptions) {
    return RankingSystem.create(vaues, options);
  }

  async addRankingPlaces(rankings) {
    try {
      logger.silly(`Adding ${rankings.length} places`); 
      const transaction = await this._sequelize.transaction();
      const chunks = splitInChunks(rankings, 500);
      for (const chunk of chunks) {
        await RankingPlace.bulkCreate(chunk, {
          ignoreDuplicates: ['PlayerId'] as any,
          transaction,
          returning: false
        });
      }
      await transaction.commit();
    } catch (err) {
      logger.error('Something went wrong adding ranking places');
      throw err;
    }
  }

  /**
   * Check if DB is migrated to latest version
   *
   * @param canMigrate Allows migration of DB
   * @param sync Forces DB to recreate every table, this also adds the default Ranking System
   */
  dbCheck(canMigrate: boolean, sync: boolean = false) {
    return new Promise(async (resolve, reject) => {
      logger.debug(`Running dbCheck with`, { canMigrate, sync });

      if (canMigrate) {
        if (!sync) {
          logger.info('Running migration');
          await this.runCommmand('sequelize db:migrate');
        } else {
          logger.info('Syncing');
          // Create non-existing schemas
          const mySchemas = ['import', 'ranking', 'event', 'security'];
          const schemas = ((await this._sequelize.showAllSchemas(
            {}
          )) as unknown) as string[];

          for (const schema of mySchemas) {
            if (schemas.indexOf(schema) === -1) {
              await this._sequelize.createSchema(schema, {});
            }
          }

          try {
            await this._sequelize.sync({ force: true });
            // await this.seedBasicInfo();
          } catch (e) {
            logger.error(e);
            throw e;
          }
        }
      }

      resolve('Good to go');
    });
  }

  runCommmand(cmd: string) {
    return new Promise((res, rej) => {
      const migrate = exec(cmd, { env: process.env }, err => {
        return err ? rej(err) : res('ok');
      });
      // Forward stdout+stderr to this process
      migrate.stdout.pipe(process.stdout);
      migrate.stderr.pipe(process.stderr);
    });
  }
}

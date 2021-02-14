import { exec } from 'child_process';
import {
  CountOptions,
  CreateOptions,
  FindOptions,
  IncludeOptions,
  Op
} from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import {
  Club,
  ClubMembership,
  Draw,
  Event,
  Game,
  GamePlayer,
  GroupSubEvents,
  GroupSystems,
  ImporterFile,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystemGroup,
  RankingSystems,
  RequestLink,
  StartingType,
  SubEvent,
  Team,
  TeamMembership
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
        models: Object.values(sequelizeModels),
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
      TeamMembership.getTableName(),
      RankingPlace.getTableName(),
      RankingPoint.getTableName(),
      Team.getTableName(),
      Club.getTableName(),
      Game.getTableName(),
      SubEvent.getTableName(),
      Draw.getTableName(),
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

  async addRankingPointsAsync(rankingPoints) {
    logger.silly(`Importing ${rankingPoints.length} rankingPoints`);
    try {
      const transaction = await this._sequelize.transaction();
      const chunks = splitInChunks(rankingPoints, 500);
      for (const chunk of chunks) {
        await RankingPoint.bulkCreate(chunk, {
          transaction,
          returning: false
        });
      }
      await transaction.commit();
    } catch (err) {
      logger.error('Something went wrong adding rankingPoints');
      throw err;
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

  async addGames(games) {
    logger.silly(`Importing ${games.length} games`);
    try {
      return await Game.bulkCreate(games, {
        ignoreDuplicates: true,
        returning: ['*']
      });
    } catch (err) {
      logger.error('Something went wrong adding games', err);
      throw err;
    }
  }

  async getGames(
    startDate: Date,
    endDate: Date,
    groups: string[]
  ): Promise<Game[]> {
    const where = {
      playedAt: {
        [Op.between]: [startDate, endDate]
      }
    };

    const games = await Game.findAll({
      where,
      attributes: [
        'id',
        'gameType',
        'winner',
        'playedAt',
        'set1Team1',
        'set1Team2'
      ],
      include: [
        { model: Player, attributes: ['id'] },
        {
          model: SubEvent,
          attributes: [],
          include: [
            {
              model: RankingSystemGroup,
              attributes: [],
              required: true,
              through: {
                where: {
                  GroupId: { [Op.in]: groups }
                }
              }
            }
          ]
        }
      ],
      mapToModel: false
    });
    return games;
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
          await this.runCommmand('set NODE_OPTIONS=--max_old_space_size=8192');
          await this.runCommmand('sequelize db:migrate');
        } else {
          logger.info('Syncing');
          await this._sequelize.sync({ force: true });

          const group = new RankingSystemGroup({
            name: 'Adults'
          });

          const system = new RankingSystem({
            name: 'BV 75/30 FINAL SYSTEM',
            rankingSystem: RankingSystems.BVL,
            amountOfLevels: 12,
            procentWinning: 75,
            procentWinningPlus1: 50,
            procentLosing: 30,
            latestXGamesToUse: null,
            minNumberOfGamesUsedForUpgrade: 7,
            maxDiffLevels: 2,
            updateIntervalAmount: 2,
            updateIntervalUnit: 'months',
            periodAmount: 52,
            periodUnit: 'weeks',
            caluclationIntervalAmount: 1,
            calculationIntervalUnit: 'weeks',
            differenceForUpgrade: 1,
            differenceForDowngrade: 0,
            startingType: StartingType.tableLFBB,
            maxLevelUpPerChange: null,
            primary: true,
            maxLevelDownPerChange: 1,
            gamesForInactivty: 3,
            inactivityAmount: 103,
            inactivityUnit: 'weeks'
          });

          await group.save();
          await system.save();

          await system.addGroup(group);
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

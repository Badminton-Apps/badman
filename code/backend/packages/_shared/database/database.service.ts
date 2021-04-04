import { Court } from './../models/sequelize/event/court.model';
import { EventCompetition, Location } from '@badvlasim/shared';
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

  async addRankingPointsAsync(rankingPoints: RankingPoint[]) {
    logger.silly(`Importing ${rankingPoints.length} rankingPoints`);
    try {
      const transaction = await this._sequelize.transaction();
      const chunks: RankingPoint[][] = splitInChunks(rankingPoints, 500);
      for (const chunk of chunks) {
        await RankingPoint.bulkCreate(
          chunk.map(c => c.toJSON()),
          {
            transaction,
            returning: false
          }
        );
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

  // private async seedBasicInfo() {
  //   const group = new RankingSystemGroup({
  //     name: 'Adults'
  //   });

  //   const system = new RankingSystem({
  //     name: 'BV 75/30 FINAL SYSTEM',
  //     rankingSystem: RankingSystems.BVL,
  //     amountOfLevels: 12,
  //     procentWinning: 75,
  //     procentWinningPlus1: 50,
  //     procentLosing: 30,
  //     latestXGamesToUse: null,
  //     minNumberOfGamesUsedForUpgrade: 7,
  //     maxDiffLevels: 2,
  //     updateIntervalAmount: 2,
  //     updateIntervalUnit: 'months',
  //     periodAmount: 52,
  //     periodUnit: 'weeks',
  //     caluclationIntervalAmount: 1,
  //     calculationIntervalUnit: 'weeks',
  //     differenceForUpgrade: 1,
  //     differenceForDowngrade: 0,
  //     startingType: StartingType.tableLFBB,
  //     maxLevelUpPerChange: null,
  //     primary: true,
  //     maxLevelDownPerChange: 1,
  //     gamesForInactivty: 3,
  //     inactivityAmount: 103,
  //     inactivityUnit: 'weeks'
  //   });

  //   await group.save();
  //   await system.save();

  //   await system.addGroup(group);
  //   // Claims/permission
  //   const dbAdminClaims = [];
  //   for (const claimName of adminClaims) {
  //     logger.silly(`Creating global claim ${claimName}`);
  //     const c = await new Claim({
  //       name: claimName[0],
  //       description: claimName[1],
  //       category: claimName[2],
  //       type: 'global'
  //     }).save();
  //     dbAdminClaims.push(c);
  //   }

  //   for (const claimName of clubClaims) {
  //     logger.silly(`Creating club claim ${claimName}`);
  //     const c = await new Claim({
  //       name: claimName[0],
  //       description: claimName[1],
  //       category: claimName[2],
  //       type: 'club'
  //     }).save();
  //   }

  //   for (const claimName of teamClaims) {
  //     logger.silly(`Creating team claim ${claimName}`);
  //     const c = await new Claim({
  //       name: claimName[0],
  //       description: claimName[1],
  //       category: claimName[2],
  //       type: 'team'
  //     }).save();
  //   }

  //   // Test Stuff
  //   const club = await new Club({
  //     id: '0e3221de-56b6-45fd-a227-f29cfaa7e2b5',
  //     name: 'Smash For Fun',
  //     clubId: 30076
  //   }).save();

  //   const player = await new Player({
  //     gender: 'M',
  //     firstName: 'Glenn',
  //     lastName: 'Latomme',
  //     memberId: '50104197',
  //     sub: 'auth0|5e81ca9e8755df0c7f7452ea'
  //   }).save();

  //   const team = await new Team({
  //     name: 'Smash For Fun 1H'
  //   }).save();

  //   const location = await new Location({
  //     name: 'Lembeke'
  //   }).save();

  //   await club.addTeam(team);
  //   await club.addLocation(location);
  //   await player.addClaims(dbAdminClaims);

  //   // create Club generates auto admin role
  //   var roles = await club.getRoles();
  //   for (const role of roles) {
  //     await role.addPlayer(player);
  //   }
  // }

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

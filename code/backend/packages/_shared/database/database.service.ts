import { exec } from 'child_process';
import { CreateOptions } from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import {
  Club,
  ClubMembership,
  DrawCompetition,
  DrawTournament,
  EventCompetition,
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
  TeamSubEventMembership,
  TeamSubEventMembershipBadmintonBvlMembershipPlayerMeta
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
        logging: config.logging ?? false,
        retry: {
          report: (message, configObj) => {
            if (configObj.$current > 5) {
              logger.warn(message);
            }
          }
        },
        models
      } as SequelizeOptions);
    }
  }

  async cleanUpImport() {
    const transaction = await this._sequelize.transaction();
    try {
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
      await this._sequelize.query(`DELETE FROM "${Player.getTableName()}"`, {
        transaction
      });

      await this._enableForeignKeyCheck(transaction);
      await transaction.commit();
    } catch (e) {
      logger.error(e);
      await transaction.rollback();
      throw e;
    }
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

  async addMetaForEnrollment(clubId: string, year: number) {
    // Get Club, team, base players from database
    const club = await this.getClubsTeamsForEnrollemnt(clubId, year);
    const primarySystem = await RankingSystem.findOne({
      where: { primary: true }
    });
    // Store in meta table
    for (const team of club.teams) {
      logger.debug(`Team: ${team.name}`);
      if (team.subEvents.length > 1) {
        logger.warn('Multiple events?');
      }

      const membership = team.subEvents[0].getDataValue(
        'TeamSubEventMembership'
      ) as TeamSubEventMembership;

      const playerMeta = [];
      const teamPlayers = [];

      for (const player of team.players) {
        const rankingPlaceMay = await RankingPlace.findOne({
          where: {
            PlayerId: player.id,
            SystemId: primarySystem.id,
            rankingDate: `${year}-05-15`
          }
        });
        player.lastRankingPlace = rankingPlaceMay.asLastRankingPlace();
        teamPlayers.push(player);

        playerMeta.push({
          playerId: player.id,
          playerSingleIndex: rankingPlaceMay.single,
          playerDoubleIndex: rankingPlaceMay.double,
          playerMixIndex: rankingPlaceMay.mix
        } as TeamSubEventMembershipBadmintonBvlMembershipPlayerMeta);
      }

      // update the players with the ranking places, this allows the calculation for baseIndex
      team.players = teamPlayers;

      membership.meta = {
        teamIndex: team.baseIndex,
        players: playerMeta
      };

      await membership.save();
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
    const transaction = await this._sequelize.transaction();
    try {
      logger.silly(`Adding ${rankings.length} places`);
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
      await transaction.rollback();
      throw err;
    }
  }

  async getClubsTeamsForEnrollemnt(clubId: string, year: number) {
    return Club.findOne({
      where: {
        id: clubId
      },
      include: [
        {
          attributes: ['name', 'teamNumber', 'type', 'abbreviation'],
          model: Team,
          where: {
            active: true
          },
          include: [
            {
              model: Player,
              as: 'captain'
            },
            {
              model: Player,
              as: 'players',
              through: { where: { base: true, end: null } }
            },
            {
              model: SubEventCompetition,
              attributes: ['id', 'name'],
              required: true,
              include: [
                {
                  required: true,
                  model: EventCompetition,
                  where: {
                    startYear: year
                  },
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ]
    });
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
            await this._sequelize.sync({ force: true});
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

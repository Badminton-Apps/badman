import { exec } from 'child_process';
import { CreateOptions, Op } from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import {
  Claim,
  Club,
  ClubMembership,
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayer,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystemGroup,
  RankingSystems,
  RequestLink,
  Role,
  StartingType,
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
          model: EncounterCompetition,
          include: [
            {
              model: DrawCompetition,
              include: [
                {
                  model: SubEventCompetition,
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
              ]
            }
          ]
        },
        {
          model: DrawTournament,
          include: [
            {
              model: SubEventTournament,
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
          // Create non-existing schemas
          const mySchemas = ['import', 'ranking', 'event', 'security'];
          var schemas = ((await this._sequelize.showAllSchemas(
            {}
          )) as unknown) as string[];

          for (const schema of mySchemas) {
            if (schemas.indexOf(schema) == -1) {
              await this._sequelize.createSchema(schema, {});
            }
          }

          try {
            await this._sequelize.sync({ force: true });
            await this.seedBasicInfo();
          } catch (e) {
            logger.error(e);
            throw e;
          }
        }
      }

      resolve('Good to go');
    });
  }

  private async seedBasicInfo() {
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

    // Claims/permission
    const dbAdminClaims = [];
    const adminClaims = [
      ['view:event', 'View an event', 'events'],
      ['add:event', 'Add an event', 'events'],
      ['edit:event', 'Edit an event', 'events'],
      ['delete:event', 'Delete an event', 'events'],
      ['import:event', 'Import an event', 'events'],
      ['view:ranking', 'View ranking system', 'ranking'],
      ['add:ranking', 'Add ranking system', 'ranking'],
      ['edit:ranking', 'Edit ranking system', 'ranking'],
      ['delete:ranking', 'Delete ranking system', 'ranking'],
      ['calculate:ranking', 'Simulate ranking', 'ranking'],
      ['make-primary:ranking', 'Make ranking system primary', 'ranking'],
      ['edit:claims', 'Edit global claims', 'security'],
      ['link:player', 'Can link players to login', 'player'],
      ['add:club', 'Create new club', 'clubs'],
      ['edit-any:club', 'Edit any club', 'clubs']
    ];

    for (const claimName of adminClaims) {
      logger.silly(`Creating global claim ${claimName}`);
      const c = await new Claim({
        name: claimName[0],
        description: claimName[1],
        category: claimName[2],
        type: 'global'
      }).save();
      dbAdminClaims.push(c);
    }

    const dbClubClaims = [];
    const clubClaims = [
      [
        'edit:club',
        'Change anything of a club (removing this can potentially remove all access to edit screen)',
        'club'
      ],
      ['add:player', 'Add players to club', 'club'],
      ['remove:player', 'Remove players to club', 'club'],
      ['add:location', 'Add location to club', 'club'],
      ['remove:location', 'Remove location to club', 'club'],
      ['add:role', 'Creates new roles for club', 'club'],
      ['edit:role', 'Edit roles for club', 'club']
    ];
    for (const claimName of clubClaims) {
      logger.silly(`Creating club claim ${claimName}`);
      const c = await new Claim({
        name: claimName[0],
        description: claimName[1],
        category: claimName[2],
        type: 'club'
      }).save();
      dbClubClaims.push(c);
    }

    const dbTeamClaims = [];
    const teamClaims = [
      ['edit:team', 'Edit competition teams', 'team'],
      ['add:team', 'Add compeition teams', 'team'],
      ['enter:results', 'Enter results for a team', 'team'],
      ['enlist:team', 'Enlist a team in to competitoin', 'team']
    ];
    for (const claimName of teamClaims) {
      logger.silly(`Creating team claim ${claimName}`);
      const c = await new Claim({
        name: claimName[0],
        description: claimName[1],
        category: claimName[2],
        type: 'team'
      }).save();
      dbTeamClaims.push(c);
    }

    // Test Stuff
    const club = await new Club({
      id: '0e3221de-56b6-45fd-a227-f29cfaa7e2b5',
      name: 'Test Club'
    }).save();

    const player = await new Player({
      gender: 'M',
      firstName: 'Glenn',
      lastName: 'Latomme',
      memberId: '50104197',
      sub: 'auth0|5e81ca9e8755df0c7f7452ea'
    }).save();
    await club.addPlayer(player, {
      through: { start: new Date('2000-01-01') }
    });
    await player.addClaims(dbAdminClaims);

    const voorzitter = await new Role({
      name: 'Voorzitter'
    }).save();
    await club.addRole(voorzitter);
    await voorzitter.addClaims(dbClubClaims);
    await voorzitter.addPlayer(player);
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

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
  RequestLink,
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
          process.env.LOG_LEVEL === 'silly' ? logger.silly.bind(logger) : false
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
      RequestLink.getTableName()
    ];

    await this._sequelize.query(
      `TRUNCATE ONLY "${tableToTruncate.join('","')}" RESTART IDENTITY`
    );
    await this._sequelize.query(`DELETE FROM "${Player.getTableName()}"`);

    await this._enableForeignKeyCheck(transaction);
    await transaction.commit();
  }

  async sync(force = false) {
    try {
      await this._disableForeignKeyCheck();
      await this._sequelize.sync({ force, alter: force });
      logger.silly('Synced');
      await this._enableForeignKeyCheck();
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

  async addUser(user) {
    return Player.findOrCreate({
      where: { firstName: user.firstName, lastName: user.lastName },
      defaults: user
    });
  }

  async addEvent(event) {
    try {
      const [result, created] = await Event.findOrCreate({
        where: { type: event.type, name: event.name },
        defaults: event
      });
      return result;
    } catch (err) {
      logger.error('Something went wrong adding event', err, event);
    }
  }

  async addEvents(events) {
    logger.silly(`Importing ${events.length} events`);
    return Event.bulkCreate(events, {
      ignoreDuplicates: true,
      returning: ['id']
    });
  }

  async addImporterFiles(files: ImporterFile[]) {
    logger.silly(`Importing ${files.length} events`);
    return ImporterFile.bulkCreate(
      files.map(f => f.toJSON()),
      {
        updateOnDuplicate: ['fileName', 'dates', 'firstDay', 'name'],
        returning: ['id']
      }
    );
  }
  async getImported(find?: FindOptions) {
    return ImporterFile.findOne(find);
  }

  async addSubEvent(event) {
    try {
      const [result, created] = await SubEvent.findOrCreate({
        where: {
          id: event.id ? event.id : null,
          name: event.name,
          eventType: event.eventType,
          drawType: event.drawType,
          levelType: event.levelType,
          level: event.level
        },
        defaults: event
      });

      return result;
    } catch (err) {
      logger.error('Something went wrong adding subevent', err, event);
      throw err;
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

  async findClub(club) {
    try {
      return await Club.findOrCreate({
        where: {
          name: club.name
        },
        defaults: club
      });
    } catch (err) {
      logger.error('Something went wrong adding clubs', err);
      throw err;
    }
  }

  async updateClub(club) {
    try {
      return await Club.update(club, { where: { name: club.name } });
    } catch (err) {
      logger.error('Something went wrong adding clubs', err);
      throw err;
    }
  }

  async findClubs(clubs) {
    try {
      return await Club.findAll({
        where: {
          name: {
            [Op.in]: clubs.map(x => x.name)
          }
        }
      });
    } catch (err) {
      logger.error('Something went wrong adding clubs', err);
      throw err;
    }
  }

  async addClubs(newClubs) {
    logger.silly(`Importing ${newClubs.length} clubs`);
    try {
      const currentClubs = await this.findClubs(newClubs);
      const toCreate = newClubs.filter(
        newClub => currentClubs.find(x => newClub.name === x.name) !== null
      );

      const created = await Club.bulkCreate(toCreate, {
        updateOnDuplicate: ['name'],
        returning: ['id']
      });

      return [...created, ...currentClubs];

      const withClubid = [];
      const withoutClubid = [];

      newClubs.forEach(newClub => {
        const inListWithId = withClubid.findIndex(x => x.name === newClub.name);
        const inListWithoutId = withoutClubid.findIndex(
          x => x.name === newClub.name
        );

        if (inListWithId === -1 && newClub.clubId) {
          withClubid.push(newClub);
          if (inListWithoutId >= 0) {
            withoutClubid.splice(inListWithoutId, 1);
          }
        } else if (inListWithoutId === -1) {
          withoutClubid.push(newClub);
        }
      });

      const dbWithClubid = await Club.bulkCreate(withClubid, {
        updateOnDuplicate: ['clubId'],
        returning: ['id']
      });
      const dbWithoutClubid = await Club.bulkCreate(withoutClubid, {
        ignoreDuplicates: true,
        returning: ['id']
      });

      return [...dbWithClubid, ...dbWithoutClubid];
    } catch (err) {
      logger.error('Something went wrong adding clubs', err);
      throw err;
    }
  }
  async addClubsMemberships(memberships) {
    logger.silly(`Importing ${memberships.length} club memberships`);
    try {
      const playerIds = memberships.map(x => x.playerId);
      const existing = await ClubMembership.findAll({
        where: {
          playerId: {
            [Op.in]: playerIds
          }
        }
      });

      for await (const membership of existing) {
        membership.active = false;
        await membership.save();
      }

      return await ClubMembership.bulkCreate(memberships, {
        ignoreDuplicates: true
      });
    } catch (err) {
      logger.error('Something went wrong adding clubmemberships', err);
      throw err;
    }
  }

  async addGames(games) {
    logger.silly(`Importing ${games.length} games`);
    try {
      return await Game.bulkCreate(games, {
        ignoreDuplicates: true,
        returning: true
      });
    } catch (err) {
      logger.error('Something went wrong adding games', err);
      throw err;
    }
  }
  async addPlayerGames(gamePlayers) {
    try {
      return await GamePlayer.bulkCreate(gamePlayers, {
        ignoreDuplicates: true,
        returning: false
      });
    } catch (err) {
      logger.error('Something went wrong adding game players', err);
      throw err;
    }
  }

  async getGames(
    startDate: Date,
    endDate: Date,
    groups: number[]
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
                  GroupId: { [Op.or]: groups }
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

  async getPlayersForGames(games: Game[], systemId: number) {
    const include: IncludeOptions = {
      model: RankingPlace,
      attributes: ['single', 'double', 'mix', 'SystemId', 'rankingDate'],
      where: {
        SystemId: systemId
      },
      required: false
    };

    const attributes = ['id'];

    // Id's
    const playerIds = games.reduce(
      (acc, val) => [...acc, ...val.players.map(p => p.id)],
      []
    );
    // distinct players
    const players = [...new Set(playerIds)];

    return Player.findAll({
      where: {
        id: players
      },
      attributes,
      include: [include],
      order: [
        [{ model: RankingPlace, as: 'rankingPlaces' }, 'rankingDate', 'desc']
      ],
      mapToModel: true
    });
  }

  async getUser(find: FindOptions) {
    return Player.findOne(find);
  }
  async getUsers(find: FindOptions) {
    return Player.findAll(find);
  }

  async getSystem(find: FindOptions) {
    return RankingSystem.findOne(find);
  }
  async addSystem(system) {
    return RankingSystem.create(system);
  }

  async getSystems(find?: FindOptions) {
    return RankingSystem.findAll(find);
  }
  async getSystemsCount(find?: CountOptions) {
    return RankingSystem.count(find);
  }

  async getEvent(find?: FindOptions) {
    return Event.findOne(find);
  }

  async makeSystemPrimary(id: number) {
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
      logger.silly(`Adding ${rankings.length} places`)
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

  dbCheck(canMigrate: boolean) {
    return new Promise(async (resolve, reject) => {
      if (canMigrate) {
        logger.info('Running migration');
        await this.runCommmand('set NODE_OPTIONS=--max_old_space_size=8192');
        await this.runCommmand('sequelize db:migrate');
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

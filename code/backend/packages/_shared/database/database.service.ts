import { exec } from 'child_process';
import { CreateOptions, Model, Op, Transaction } from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import {
  Club,
  ClubMembership,
  Comment,
  DrawCompetition,
  DrawTournament,
  EntryCompetitionPlayers,
  EventCompetition,
  EventEntry,
  EventTournament,
  Game,
  GamePlayer,
  LastRankingPlace,
  Player,
  PlayerClaimMembership,
  PlayerRoleMembership,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RequestLink,
  Standing,
  SubEventCompetition,
  SubEventTournament,
  Team,
  TeamPlayerMembership,
} from '../models';
import * as sequelizeModels from '../models/sequelize';
import { logger } from '../utils/logger';
import { splitInChunks } from '../utils/utils';
import SequelizeSlugify from 'sequelize-slugify';

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
        data: {
          ...config,
        },
      });

      this._dialect = config.dialect;

      // Initialize Sequelize
      DataBaseHandler.sequelizeInstance = new Sequelize({
        ...config,
        logging: config.logging ?? false,
        retry: {
          report: (message, configObj) => {
            if (configObj.$current > 5) {
              logger.warn(message);
            }
          },
        },
        models,
      } as SequelizeOptions);

      // Addons & Plugins
      SequelizeSlugify.slugifyModel(Player as unknown as Model, {
        source: ['firstName', 'lastName'],
      });
      SequelizeSlugify.slugifyModel(EventCompetition as unknown as Model, {
        source: ['name'],
      });
      SequelizeSlugify.slugifyModel(EventTournament as unknown as Model, {
        source: ['name'],
      });
      SequelizeSlugify.slugifyModel(Club as unknown as Model, {
        source: ['name'],
      });
      SequelizeSlugify.slugifyModel(Team as unknown as Model, {
        source: ['name'],
      });
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
        EventEntry.getTableName(),
        Standing.getTableName(),
        RankingPlace.getTableName(),
        RankingPoint.getTableName(),
        Team.getTableName(),
        Club.getTableName(),
        Game.getTableName(),
        SubEventCompetition.getTableName(),
        SubEventTournament.getTableName(),
        DrawCompetition.getTableName(),
        DrawTournament.getTableName(),
        RequestLink.getTableName(),
      ];

      await this._sequelize.query(
        `TRUNCATE ONLY "${tableToTruncate.join('","')}" RESTART IDENTITY`
      );
      await this._sequelize.query(`DELETE FROM "${Player.getTableName()}"`, {
        transaction,
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
          transaction,
        });
        break;
      case 'postgres':
        await this._sequelize.query("SET session_replication_role='replica'", {
          raw: true,
          transaction,
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
          transaction,
        });
        break;
      case 'postgres':
        await this._sequelize.query("SET session_replication_role='origin'", {
          raw: true,
          transaction,
        });
        break;
    }
  }

  async addMetaForEnrollment(clubId: string, year: number) {
    // Get Club, team, base players from database
    const club = await this.getClubsTeamsForEnrollemnt(clubId, year);
    const primarySystem = await RankingSystem.findOne({
      where: { primary: true },
    });
    // Store in meta table
    for (const team of club?.teams) {
      logger.debug(`Team: ${team.name}`);
      if (team.entries.length > 1) {
        logger.warn('Multiple events?');
      }

      const membership = (await team.getEventEntrys())[0];

      const playerMeta = [];
      const teamPlayers = [];

      for (const player of team.players) {
        const rankingPlaceMay = await RankingPlace.findOne({
          where: {
            playerId: player.id,
            SystemId: primarySystem.id,
            rankingDate: `${year}-05-15`,
          },
        });
        player.lastRankingPlaces = [
          rankingPlaceMay.asLastRankingPlace() as LastRankingPlace,
        ];
        teamPlayers.push(player);

        playerMeta.push({
          id: player.id,
          single: rankingPlaceMay.single,
          double: rankingPlaceMay.double,
          mix: rankingPlaceMay.mix,
          gender: player.gender,
        } as EntryCompetitionPlayers);
      }

      // update the players with the ranking places, this allows the calculation for baseIndex
      team.players = teamPlayers;

      membership.meta = {
        competition: {
          teamIndex: team.baseIndex(primarySystem),
          players: playerMeta,
        },
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
        returning: ['id'],
      });
    } catch (err) {
      logger.error('Something went wrong adding users', err);
      throw err;
    }
  }

  async makeSystemPrimary(id: string) {
    const currentSystems = await RankingSystem.findAll({
      where: { primary: true },
    });
    currentSystems.forEach((system) => {
      system.primary = false;
      system.save();
    });

    const newSystem = await RankingSystem.findByPk(id);
    if (newSystem) {
      newSystem.primary = true;
      newSystem.save();
    }
  }

  async createSystem(vaues: RankingSystem, options: CreateOptions) {
    return RankingSystem.create(vaues.toJSON(), options);
  }

  async addRankingPlaces(rankings: RankingPlace[]) {
    const transaction = await this._sequelize.transaction();
    try {
      logger.silly(`Adding ${rankings.length} places`);
      const chunks = splitInChunks(rankings, 500);
      for (const chunk of chunks) {
        await RankingPlace.bulkCreate(chunk, {
          ignoreDuplicates: true,
          transaction,
          returning: false,
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
        id: clubId,
      },
      include: [
        {
          attributes: ['name', 'teamNumber', 'type', 'abbreviation'],
          model: Team,
          where: {
            active: true,
          },
          include: [
            {
              model: Player,
              as: 'captain',
            },
            {
              model: Player,
              as: 'players',
              through: { where: { base: true, end: null } },
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
                    startYear: year,
                  },
                  attributes: ['id', 'name'],
                },
              ],
            },
          ],
        },
      ],
    });
  }

  /**
   * @param {string} destination The player where all info will be copied to
   * @param {string} source The player where the info will be copied from
   */

  async mergePlayers(
    destination: string | Player,
    sources: (string | Player)[],
    args?: { canBeDifferentMemberId?: boolean; transaction?: Transaction }
  ) {
    args = {
      canBeDifferentMemberId: false,
      ...args,
    };

    let destinationPlayer: Player;
    const sourcePlayers: Player[] = [];

    if (destination instanceof Player) {
      destinationPlayer = destination;
    } else {
      destinationPlayer = await Player.findByPk(destination, {
        transaction: args?.transaction,
      });
    }

    for (const source of sources) {
      if (source instanceof Player) {
        sourcePlayers.push(source);
      } else {
        sourcePlayers.push(
          await Player.findByPk(source, {
            transaction: args?.transaction,
          })
        );
      }
    }

    // Change destination memberId so no constraint violation occurs
    const originalMemeberId = destinationPlayer.memberId;
    destinationPlayer.memberId += '_before_merge';
    await destinationPlayer.save({ transaction: args?.transaction });

    // MERGE!!!
    for (const sourcePlayer of sourcePlayers) {
      if (
        sourcePlayer.memberId !== originalMemeberId &&
        args.canBeDifferentMemberId === false
      ) {
        throw new Error(
          `Source and destination player don't have the same memberid`
        );
      }

      await this._mergePlayers(destinationPlayer, sourcePlayer, args);
    }

    // Put original back
    destinationPlayer.memberId = originalMemeberId;
    await destinationPlayer.save({ transaction: args?.transaction });
  }

  async _mergePlayers(
    destination: Player,
    source: Player,
    args?: { transaction?: Transaction }
  ) {
    if (source.id === destination.id) {
      throw new Error('Source and destination player are the same');
    }

    if (destination === null) {
      throw new Error('destination does not exist');
    }

    if (source === null) {
      throw new Error('source does not exist');
    }

    logger.debug(
      `Merging into ${destination.fullName} (${destination.memberId})`
    );

    // Move memberships
    const destinationClubMemberships = await ClubMembership.findAll({
      where: { playerId: destination.id },
      transaction: args.transaction,
    });

    // We only update if the releation ship doesn't exists already
    // NOTE: If a person is returning to the club this isn't registerd
    await ClubMembership.update(
      { playerId: destination.id },
      {
        where: {
          playerId: source.id,
          clubId: {
            [Op.notIn]: destinationClubMemberships.map((row) => row.clubId),
          },
        },
        returning: false,
        transaction: args.transaction,
      }
    );

    // set all to
    await ClubMembership.update(
      { end: new Date() },
      {
        where: {
          playerId: destination.id,
        },
        returning: false,
        transaction: args.transaction,
      }
    );

    // Set the last created as current club membership
    const lastCreated = await ClubMembership.findOne({
      where: { playerId: destination.id },
      order: [['createdAt', 'DESC']],
      transaction: args.transaction,
    });
    if (lastCreated) {
      lastCreated.end = null;
      await lastCreated.save({ transaction: args.transaction });
    }

    const destinationTeamMemberships = await TeamPlayerMembership.findAll({
      where: { playerId: destination.id },
      transaction: args.transaction,
    });

    // NOTE: If a person is returning to the team this isn't registerd
    await TeamPlayerMembership.update(
      { playerId: destination.id },
      {
        where: {
          playerId: source.id,
          teamId: {
            [Op.notIn]: destinationTeamMemberships.map((row) => row.teamId),
          },
        },
        returning: false,
        transaction: args.transaction,
      }
    );

    const destinationRoleMemberships = await PlayerRoleMembership.findAll({
      where: { playerId: destination.id },
      transaction: args.transaction,
    });

    await PlayerRoleMembership.update(
      { playerId: destination.id },
      {
        where: {
          playerId: source.id,
          roleId: {
            [Op.notIn]: destinationRoleMemberships.map((row) => row.roleId),
          },
        },
        returning: false,
        transaction: args.transaction,
      }
    );

    const destinationClaimMemberships = await PlayerClaimMembership.findAll({
      where: { playerId: destination.id },
      transaction: args.transaction,
    });

    await PlayerClaimMembership.update(
      { playerId: destination.id },
      {
        where: {
          playerId: source.id,
          claimId: {
            [Op.notIn]: destinationClaimMemberships.map((row) => row.claimId),
          },
        },
        returning: false,
        transaction: args.transaction,
      }
    );

    // Delete reamining memberships
    await ClubMembership.destroy({
      where: { playerId: source.id },
      transaction: args.transaction,
    });
    await TeamPlayerMembership.destroy({
      where: { playerId: source.id },
      transaction: args.transaction,
    });
    await PlayerRoleMembership.destroy({
      where: { playerId: source.id },
      transaction: args.transaction,
    });
    await PlayerClaimMembership.destroy({
      where: { playerId: source.id },
      transaction: args.transaction,
    });

    // Update where the player isn't a unique key
    const gameCount = await GamePlayer.count({
      where: {
        playerId: source.id,
      },
      transaction: args.transaction,
    });

    if (gameCount > 0) {
      await GamePlayer.update(
        { playerId: destination.id },
        {
          where: {
            playerId: source.id,
          },
          returning: false,
          transaction: args.transaction,
        }
      );
    }

    const commentCount = await Comment.count({
      where: {
        playerId: source.id,
      },
      transaction: args.transaction,
    });

    if (commentCount > 0) {
      await Comment.update(
        { playerId: destination.id },
        {
          where: {
            playerId: source.id,
          },
          returning: false,
          transaction: args.transaction,
        }
      );
    }

    const pointCount = await RankingPoint.count({
      where: {
        playerId: source.id,
      },
      transaction: args.transaction,
    });

    if (pointCount > 0) {
      await RankingPoint.update(
        { playerId: destination.id },
        {
          where: {
            playerId: source.id,
          },
          returning: false,
          transaction: args.transaction,
        }
      );
    }

    const placesDest = await destination.getRankingPlaces({
      transaction: args.transaction,
    });

    const lplacesDest = await destination.getLastRankingPlaces({
      transaction: args.transaction,
    });

    await RankingPlace.update(
      { playerId: destination.id },
      {
        where: {
          playerId: source.id,
          rankingDate: {
            [Op.notIn]: placesDest?.map((row) => row.rankingDate.toString()),
          },
        },
        returning: false,
        transaction: args.transaction,
      }
    );

    await LastRankingPlace.update(
      { playerId: destination.id },
      {
        where: {
          playerId: source.id,
          systemId: {
            [Op.notIn]: lplacesDest?.map((row) => row.systemId),
          },
        },
        returning: false,
        transaction: args.transaction,
      }
    );

    await LastRankingPlace.destroy({
      where: {
        playerId: source.id,
      },
      transaction: args.transaction,
    });

    await RankingPlace.destroy({
      where: {
        playerId: source.id,
      },
      transaction: args.transaction,
    });

    destination.sub = destination.sub ?? source.sub;
    destination.memberId = (destination.memberId ?? source.memberId).trim();
    destination.competitionPlayer =
      destination.competitionPlayer ?? source.competitionPlayer;
    destination.birthDate = destination.birthDate ?? source.birthDate;
    destination.firstName = this.pascalCase(
      destination.firstName ?? source.firstName
    ).trim();
    destination.lastName = this.pascalCase(
      destination.lastName ?? source.lastName
    ).trim();

    await source.destroy({ transaction: args.transaction });
    await destination.save({ transaction: args.transaction });
  }

  pascalCase = (sentence: string) => {
    return sentence
      .toLowerCase()
      .split(' ')
      .map((word) => {
        return this.firstUppercase(word);
      })
      .join(' ');
  };

  firstUppercase = (word: string) => {
    return word && word.charAt(0).toUpperCase() + word.slice(1);
  };

  /**
   * Check if DB is migrated to latest version
   *
   * @param canMigrate Allows migration of DB
   * @param sync Forces DB to recreate every table, this also adds the default Ranking System
   */
  dbCheck(canMigrate: boolean, sync = false) {
    return new Promise(async (resolve) => {
      logger.debug(`Running dbCheck with`, { data: { canMigrate, sync } });

      if (canMigrate) {
        if (!sync) {
          logger.info('Running migration');
          await this.runCommmand(
            `npx sequelize-cli db:migrate  --config="${process.env.DB_PATH}/database/database.config.js"  --models-path="${process.env.DB_PATH}/models/sequelize"  --seeders-path="${process.env.DB_PATH}/database/seeders"  --migrations-path="${process.env.DB_PATH}/database/migrations"`
          );
        } else {
          logger.info('Syncing');
          // Create non-existing schemas
          const mySchemas = ['import', 'ranking', 'event', 'security', 'job'];
          const schemas = (await this._sequelize.showAllSchemas(
            {}
          )) as unknown as string[];

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
      const migrate = exec(cmd, { env: process.env }, (err) => {
        return err ? rej(err) : res('ok');
      });
      // Forward stdout+stderr to this process
      migrate.stdout.pipe(process.stdout);
      migrate.stderr.pipe(process.stderr);
    });
  }
}

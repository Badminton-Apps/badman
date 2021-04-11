import {
  ClubMembership,
  DrawType,
  GameType,
  ImporterFile,
  LevelType,
  logger,
  SubEventType,
  TeamPlayerMembership,
  titleCase
} from '@badvlasim/shared';
import moment, { Moment } from 'moment';
import prettyMilliseconds from 'pretty-ms';
import { Op, Transaction } from 'sequelize';
import { ImportStep } from './import-step';

export abstract class ProcessImport {
  protected importSteps: Map<string, ImportStep<any>>;
  protected importFileSteps: Map<string, ImportStep<any>>;

  constructor() {
    this.importSteps = new Map();
    this.importFileSteps = new Map();
  }

  async import(args: any) {
    const totalStart = new Date().getTime();
    logger.debug(`Running import`);
    for (const [name, step] of this.importSteps) {
      logger.debug(`Running step: ${name}`);
      const start = new Date().getTime();

      try {
        await step.executeStep(args);
      } catch (e) {
        logger.error(`Step ${name}, failed`, e);
        throw e;
      }

      logger.debug(
        `Finished step ${name}, time: ${prettyMilliseconds(new Date().getTime() - start)}`
      );
    }
    logger.debug(`Finished import, time: ${prettyMilliseconds(new Date().getTime() - totalStart)}`);
  }

  async importFile(args) {
    const totalStart = new Date().getTime();

    logger.debug(`Running importFile`);
    for (const [name, step] of this.importFileSteps) {
      logger.debug(`Running step: ${name}`);
      const start = new Date().getTime();

      try {
        await step.executeStep(args);
      } catch (e) {
        logger.error(`Step ${name}, failed`, {
          args,
          error: e
        });
        throw e;
      }

      logger.debug(
        `Finished step ${name}, time: ${prettyMilliseconds(new Date().getTime() - start)}`
      );
    }
    logger.debug(
      `Finished importFile, time: ${prettyMilliseconds(new Date().getTime() - totalStart)}`
    );
  }

  protected addImportStep(step: ImportStep<any>, override: boolean = false) {
    if (!override && !this.importSteps.has(step.name)) {
      this.importSteps.set(step.name, step);
    } else {
      logger.debug(`Steps:`, [...this.importSteps.keys()], 'new Step', step.name);
      throw new Error('Step already exists');
    }
  }

  protected addImportFileStep(step: ImportStep<any>, override: boolean = false) {
    if (!override && !this.importFileSteps.has(step.name)) {
      this.importFileSteps.set(step.name, step);
    } else {
      logger.debug(`Steps:`, [...this.importFileSteps.keys()], 'new Step', step.name);
      throw new Error('Step already exists');
    }
  }

  // #region Helper functions
  protected isElkGeslacht(gender) {
    return gender === 6;
  }

  protected getEventType(gender): SubEventType {
    if (gender === 3 || gender === 6) {
      return SubEventType.MX;
    } else if (gender === 2 || gender === 5) {
      return SubEventType.F;
    } else if (gender === 1 || gender === 4) {
      return SubEventType.M;
    }

    throw new Error(`Got unexpected eventType. Params; gender:${gender}`);
  }

  protected getGameType(eventtype, gender): GameType {
    if (gender === 3) {
      return GameType.MX;
    }

    switch (eventtype) {
      case '1':
        return GameType.S;
      case '2':
        return GameType.D;
      default:
        logger.warn(`Unsupported gameType ${eventtype}`);
    }
  }

  protected getMatchType(type: string | number) {
    switch (type) {
      case 1:
      case 2:
      case 'HE':
      case 'DE':
        return GameType.S;
      case 3:
      case 4:
      case 'HD':
      case 'DD':
        return GameType.D;
      case 5:
      case 'GD':
        return GameType.MX;
      default:
        logger.debug(`Unsupported type ${type}`);
    }
  }

  protected getDrawType(drawtype): DrawType {
    // Drawtype: 3 = Uitspeelschema
    // Drawtype: 5 = Kompass
    if (drawtype === 1 || drawtype === 3 || drawtype === 5) {
      return DrawType.KO;
    } else if (drawtype === 2 || drawtype === 4) {
      return DrawType.POULE;
    } else if (drawtype === 6) {
      return DrawType.QUALIFICATION;
    }
    logger.warn(`Got unexpected drawType. Params; drawtype:${drawtype}`);
    return null;
  }

  protected getLeague(importedFile: ImporterFile): LevelType {
    if (
      importedFile.name.toLowerCase().indexOf('vlaanderen') === -1 &&
      importedFile.name.toLowerCase().indexOf('vlaamse') === -1 &&
      importedFile.name.toLowerCase().indexOf('nationaal') === -1 &&
      importedFile.name.toLowerCase().indexOf('victor') === -1
    ) {
      return LevelType.PROV;
    } else {
      if (
        importedFile.name.toLowerCase().indexOf('vlaanderen') !== -1 ||
        importedFile.name.toLowerCase().indexOf('vlaamse') !== -1
      ) {
        return LevelType.LIGA;
      }

      return LevelType.NATIONAL;
    }
  }

  protected getLevel(name: string): number {
    const matches = name.match(/\d+/g);
    if (matches.length === 1) {
      return Number.parseInt(matches[0], 10);
    }
    if (matches.length > 1) {
      logger.warn('More matches, please investigate');
      return Number.parseInt(matches[0], 10);
    }

    logger.warn('No level found, please investigate');
    return -1;
  }

  protected cleanedTeamName(name: string) {
    name = name?.replace(/\(\d+\)/, '');
    name = name?.replace('&amp;', '&');

    return name;
  }

  protected cleanedClubName(name: string) {
    name = name?.replace(/(\ \d+[G|H|D]\ ?)/, '');
    name = name?.replace(/\(\d+\)/, '');
    name = name?.replace(/( ?BC ?)/, '');
    name = titleCase(name);

    if (!isNaN(parseInt(name[0], 10))) {
      name[1]?.toUpperCase();
    }
    return name;
  }

  protected cleanedSubEventName(name: string) {
    name = name?.replace(/( [A-Z]$)/, '');

    return name;
  }

  // #endregion

  // #region sharedMethods
  protected async addToTeams(
    playersIds: string[],
    inputStart: Moment,
    teamId: string,
    args?: { transaction?: Transaction; hooks?: boolean }
  ) {
    // Force start and end to 1 september
    const start = moment(inputStart)
      .set('month', 8)
      .startOf('month');

    // Get all existing memberships of the players
    const dbTeamMemberships = await TeamPlayerMembership.findAll({
      where: {
        playerId: {
          [Op.in]: playersIds.map(r => r)
        },
        end: null
      },
      transaction: args.transaction
    });

    const newMmemberships = [];

    for await (const playerId of playersIds) {
      const dbTeamPlayerMemberships = dbTeamMemberships.filter(
        m => m.playerId === playerId && m.teamId === teamId
      );

      if (dbTeamPlayerMemberships.length > 1) {
        logger.warn("this shouldn't happen", playerId);
      }

      // if same team, add on year
      if (dbTeamPlayerMemberships && dbTeamPlayerMemberships.length === 1) {
        return;
      }

      // new membership
      newMmemberships.push(
        new TeamPlayerMembership({
          playerId,
          teamId,
          start: start.toDate()
        }).toJSON()
      );
    }

    await TeamPlayerMembership.bulkCreate(newMmemberships, {
      ignoreDuplicates: true,
      transaction: args.transaction,
      hooks: args.hooks ?? false
    });
  }

  protected async addToClubs(
    playersIds: string[],
    inputStart: Moment,
    clubId: string,
    args?: { transaction?: Transaction; hooks?: boolean }
  ) {
    // Force start and end to 1 september
    const start = moment(inputStart)
      .set('month', 8)
      .startOf('month');

    // Get all existing memberships of the players
    const dbClubMemberships = await ClubMembership.findAll({
      where: {
        playerId: {
          [Op.in]: playersIds.map(r => r)
        },
        end: null
      },
      transaction: args.transaction
    });

    const newMmemberships = [];
    for await (const playerId of playersIds) {
      const dbclubPlayerMemberships = dbClubMemberships.filter(m => m.playerId === playerId);
      // cancel all current subscriptions
      for (const club of dbclubPlayerMemberships) {
        if (club.clubId !== clubId) {
          club.end = start.toDate();
          await club.save({ transaction: args.transaction });
        }
      }

      if (dbclubPlayerMemberships.find(r => r.clubId === clubId) == null) {
        // new membership
        newMmemberships.push(
          new ClubMembership({
            playerId,
            clubId,
            start: start.toDate()
          }).toJSON()
        );
      }
    }

    if (newMmemberships.length > 0) {
      await ClubMembership.bulkCreate(newMmemberships, {
        ignoreDuplicates: true,
        transaction: args.transaction,
        hooks: args.hooks ?? false
      });
    }
  }
  // #endregion
}

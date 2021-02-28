import {
  correctWrongPlayers,
  csvToArray,
  Event,
  EventType,
  flatten,
  Game,
  GamePlayer,
  ICsvDraw,
  ICsvEvent,
  ICsvLocation,
  ICsvCourt,
  ImporterFile,
  logger,
  Player,
  SubEvent,
  titleCase,
  Court,
  Location,
  EventImportType,
  LevelType,
  GameType,
  DrawType,
  Draw,
  DataBaseHandler,
  SubEventType,
  ImportSubEvent,
  ImportDraw
} from '@badvlasim/shared';
import { Hash } from 'crypto';
import { existsSync as dbCours } from 'fs';
import { FindOrCreateOptions, Op, Transaction } from 'sequelize';
import { Mdb } from '../convert/mdb';
import { TpPlayer } from '../models';

export abstract class Importer {
  constructor(
    protected mdb: Mdb,
    protected type: EventType,
    protected importType: EventImportType,
    protected transaction: Transaction
  ) {}

  async addEvent(importerFile: ImporterFile, event?: Event): Promise<Event> {
    try {
      if (event == null) {
        event = await this.addEventFromImporterFile(importerFile);
      } else {
        // Cleanup
        const subEvents = await SubEvent.findAll({
          where: {
            EventId: event.id
          },
          include: [{ model: Draw }]
        });

        const draws = subEvents.map(s => s.draws.map(r => r.id)).flat(1);

        await Game.destroy({
          where: {
            drawId: {
              [Op.in]: draws
            }
          },
          cascade: true
        });
      }

      const locations = await this.addLocations(event);
      const courts = await this.addCourts(locations);
      const players = await this.addPlayers();

      if (!players || players?.length === 0) {
        return event;
      }

      await this.addGames(
        event.subEvents
          .map(s => {
            s.draws.map(d => {
              d.subEvent = s;
              return d;
            });
            return s.draws;
          })
          .flat(1),
        players,
        courts
      );
    } catch (e) {
      logger.error('FUCK', e);
      throw e;
    }
  }

  protected async addLocations(event: Event) {
    const csvLocations = await csvToArray<ICsvLocation[]>(await this.mdb.toCsv('Location'), {
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });
    const locations = new Map<string, Location>();

    for (const location of csvLocations) {
      const [dbLocation, created] = await Location.findOrCreate({
        where: {
          name: location.name
        },
        defaults: {
          name: location.name,
          address: location.address || undefined,
          postalcode: location.postalcode || undefined,
          city: location.city || undefined,
          state: location.state || undefined,
          phone: location.phone || undefined,
          fax: location.fax || undefined
        }
      });

      locations.set(location.id, dbLocation);
    }

    return locations;
  }

  protected async addCourts(locations: Map<string, Location>) {
    const csvCourts = await csvToArray<ICsvCourt[]>(await this.mdb.toCsv('Court'), {
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });
    const courts = new Map<string, Court>();
    for (const court of csvCourts) {
      const locationId = locations.get(court.location).id;
      const [dbCourt, created] = await Court.findOrCreate({
        where: {
          name: court.name,
          locationId
        },
        defaults: {
          name: court.name,
          locationId
        }
      });

      courts.set(court.id, dbCourt);
    }

    return courts;
  }

  protected async addImporterfile(fileLocation: string) {
    if (!dbCours(fileLocation)) {
      logger.error('File does not exist', fileLocation);
      throw new Error('File does not exist');
    }

    this.mdb = new Mdb(fileLocation);
    const file = await this.extractImporterFile();
    file.fileLocation = fileLocation;
    file.type = this.importType;

    // Long dates gives issues
    if (file.dates.length > 100) {
      const dates = file.dates.split(',');
      file.dates = `${dates[0]},${dates[dates.length - 1]}`;
    }

    const options: FindOrCreateOptions = {
      defaults: file.toJSON(),
      where: {
        name: file.name,
        dates: file.dates
      }
    };

    if (file.linkCode) {
      options.where = {
        ...options.where,
        linkCode: file.linkCode
      };
    }

    if (file.uniCode) {
      options.where = {
        ...options.where,
        uniCode: file.uniCode
      };
    }

    if (file.webID) {
      options.where = {
        ...options.where,
        webID: file.webID
      };
    }

    const [result] = await ImporterFile.findOrCreate(options);

    return result;
  }

  protected async addImportedSubEvents(file: ImporterFile, levelType?: LevelType) {
    const { csvEvents, csvDraws } = await this.getSubEventsCsv();
    const subEvents: ImportSubEvent[] = [];
    const draws: ImportDraw[] = [];

    for (const csvEvent of csvEvents) {
      subEvents.push(
        new ImportSubEvent({
          name: csvEvent.name,
          internalId: parseInt(csvEvent.id, 10),
          gameType: this.getGameType(csvEvent.eventtype, parseInt(csvEvent.gender, 10)),
          FileId: file.id,
          eventType: this.getEventType(parseInt(csvEvent.gender, 10)),
          levelType
        })
      );
    }

    const dbsubEvents = await ImportSubEvent.bulkCreate(
      subEvents.map(r => r.toJSON()),
      { returning: ['id', 'internalId'] }
    );

    for (const csvDraw of csvDraws) {
      const dbSubEvent = dbsubEvents.find(e => e.internalId === parseInt(csvDraw.event, 10));

      draws.push(
        new ImportDraw({
          name: csvDraw.name,
          internalId: parseInt(csvDraw.id, 10),
          type: this.getDrawType(parseInt(csvDraw.drawtype, 10)),
          SubEventId: dbSubEvent.id
        })
      );
    }
    await ImportDraw.bulkCreate(
      draws.map(r => r.toJSON()),
      { ignoreDuplicates: true }
    );

    return ImportSubEvent.findAll({
      where: {
        FileId: file.id
      },
      include: [{ model: ImportDraw }]
    });
  }

  protected async addEventFromImporterFile(importerFile: ImporterFile) {
    const where: {
      // Required
      name: string;
      dates: string;
      type: string;
      // optional
      [key: string]: any;
    } = {
      name: importerFile.name,
      dates: importerFile.dates,
      type: this.type
    };

    if (importerFile.uniCode) {
      where.uniCode = importerFile.uniCode;
    }
    if (importerFile.firstDay) {
      where.firstDay = importerFile.firstDay;
    }
    if (importerFile.toernamentNumber) {
      where.toernamentNumber = importerFile.toernamentNumber;
    }

    const foundEvent = await Event.findOne({
      where,
      include: [{ model: SubEvent }]
    });

    if (foundEvent) {
      return foundEvent;
    }

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbEvent = await Event.build({
        name: importerFile.name,
        uniCode: importerFile.uniCode,
        firstDay: importerFile.firstDay,
        dates: importerFile.dates,
        toernamentNumber: importerFile.toernamentNumber,
        type: this.type
      }).save({ transaction });

      const subEvents = [];
      for (const subEvent of importerFile.subEvents) {
        // Remove id from importerSubEvent
        const { id: subEventId, ...importSubEvent } = subEvent.toJSON() as any;

        const sub = new SubEvent({
          ...importSubEvent,
          EventId: dbEvent.id
        });

        await sub.save({ transaction });

        const draws = [];
        for (const draw of subEvent.draws) {
          // Remove id from importerSubEvent
          const { id: drawId, ...importDraw } = draw.toJSON() as any;
          const d = await new Draw({
            ...importDraw,
            SubEventId: sub.id
          }).save({ transaction });

          draws.push(d);
        }
        sub.draws = draws;
        subEvents.push(sub);
      }

      dbEvent.subEvents = subEvents;
      await transaction.commit();
      return dbEvent;
    } catch (e) {
      logger.error('import failed', e);
      await transaction.rollback();
      throw e;
    }
  }

  protected async extractImporterFile() {
    const settingsCsv = await this.mdb.toCsv('Settings');
    const settings = await csvToArray<{
      name: string;
      linkCode: string;
      webID: string;
      uniCode: string;
      toernamentNumber: number;
    }>(settingsCsv, {
      onEnd: data => {
        return {
          name: data.find((r: { name: string }) => r.name.toLowerCase() === 'tournament')
            .value as string,
          linkCode: data.find((r: { name: string }) => r.name.toLowerCase() === 'linkcode')
            ?.value as string,
          webID: data.find((r: { name: string }) => r.name.toLowerCase() === 'webid')
            ?.value as string,
          uniCode: data.find((r: { name: string }) => r.name.toLowerCase() === 'unicode')
            ?.value as string,
          toernamentNumber: data.find(
            (r: { name: string }) => r.name.toLowerCase() === 'tournamentNr'
          )?.value as number
        };
      },
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });

    const daysCsv = await this.mdb.toCsv('TournamentDay');
    const days = await csvToArray<{ dates: Date[] }>(daysCsv, {
      onEnd: data => {
        return {
          dates: data
            .map((date: { tournamentday: string | number | Date }) => new Date(date.tournamentday))
            .sort(
              (a: { getTime: () => number }, b: { getTime: () => number }) =>
                a.getTime() - b.getTime()
            )
        };
      },
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });

    let dates = days.dates.map(x => x.toISOString()).join(',');
    if (days.dates.length > 7) {
      dates = `${days.dates[0]},${days.dates[days.dates.length - 1].toISOString()}`;
    }

    const importerFile = new ImporterFile({
      ...settings,
      firstDay: days.dates[0],
      dates
    });

    return importerFile;
  }

  protected async getSubEventsCsv() {
    const csvEvents = await csvToArray<ICsvEvent[]>(await this.mdb.toCsv('Event'), {
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });
    const csvDraws = await csvToArray<ICsvDraw[]>(await this.mdb.toCsv('Draw'), {
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });
    return { csvEvents, csvDraws };
  }

  protected async addPlayers() {
    const csvPlayers = (
      await csvToArray<{ player: any; playerId: string }[]>(await this.mdb.toCsv('Player'), {
        onAdd: async csvPlayer => {
          const player = correctWrongPlayers({
            memberId: csvPlayer.memberid,
            firstName: titleCase(csvPlayer.firstname),
            lastName: titleCase(csvPlayer.name),
            gender: csvPlayer.gender,
            birthDate: csvPlayer.birthDate,
            club: csvPlayer.club
          });

          return {
            player: new Player({
              ...player
            }).toJSON(),
            playerId: csvPlayer.id
          };
        },
        onError: e => {
          logger.error('Parsing went wrong', {
            error: e
          });
          throw e;
        }
      })
    ).filter((thing, i, arr) =>
      thing.player.memberId
        ? arr.findIndex(t => t.player.memberId === thing.player.memberId) === i
        : // Less accurate
          arr.findIndex(
            t =>
              t.player.firstName === thing.player.firstName &&
              t.player.lastName === thing.player.lastName
          ) === i
    );

    const p = csvPlayers.map(x => {
      return { ...x.player };
    });
    const dbPlayers = await Player.bulkCreate(
      p,
      { returning: ['*'], updateOnDuplicate: ['memberId'] } // Return ALL comulms
    );

    return dbPlayers.map(
      (dbPlayer, i) => new TpPlayer({ player: dbPlayer, playerId: csvPlayers[i].playerId })
    );
  }

  protected async addGamesCsv(csvGames) {
    const g = csvGames.map(x => x.game);
    let dbGames;
    try {
      dbGames = await Game.bulkCreate(
        g,
        { returning: ['*'], ignoreDuplicates: true } // Return ALL comulms
      );
    } catch (e) {
      throw e;
    }

    const gamePlayersWithGameId = dbGames.reduce((acc, cur, idx) => {
      const games = csvGames[idx].gamePlayers.map(x => {
        x.gameId = cur.id;
        return x;
      });

      for (const game of games) {
        // filterout unique (game id will be same beacuse Game.bulkInsert will fix this :P )
        if (acc.findIndex(x => x.gameId === game.gameId && x.playerId === game.playerId) === -1) {
          acc.push(game);
        }
      }
      return acc;
    }, []);

    await GamePlayer.bulkCreate(flatten(gamePlayersWithGameId), { ignoreDuplicates: true });
  }

  protected async getClubs() {
    return csvToArray(await this.mdb.toCsv('Club'), {
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });
  }

  protected abstract addGames(draw: Draw[], players: TpPlayer[], courts: Map<string, Court>);

  /// Helper functions
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
      importedFile.fileLocation.indexOf('vlaanderen') === -1 &&
      importedFile.fileLocation.indexOf('nationaal') === -1
    ) {
      return LevelType.PROV;
    } else {
      return importedFile.fileLocation.indexOf('vlaanderen') !== -1
        ? LevelType.LIGA
        : LevelType.NATIONAAL;
    }
  }
}

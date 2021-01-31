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
  EventImportType
} from '@badvlasim/shared';
import { Hash } from 'crypto';
import { existsSync as dbCours } from 'fs';
import { FindOrCreateOptions, Transaction } from 'sequelize/types';
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
      }
      const locations = await this.addLocations(event);
      const courts = await this.addCourts(locations);

      const players = await this.addPlayers();

      if (!players || players?.length === 0) {
        return event;
      }

      await this.addGames(event.subEvents, players, courts);
    } catch (e) {
      logger.error('FUCK', e);
      throw e;
    }
  }

  protected async addLocations(event: Event) {
    const csvLocations = await csvToArray<ICsvLocation[]>(await this.mdb.toCsv('Location'));
    const l = csvLocations.map(r => {
      return {
        ...r,
        eventId: event.id,
        id: undefined
      };
    });

    const dbLocations = await Location.bulkCreate(
      l,
      { returning: true, ignoreDuplicates: true } // Return ALL comulms
    );

    const locations = new Map<string, Location>();
    for (const [i, location] of csvLocations.entries()) {
      locations.set(location.id, dbLocations[i]);
    }

    return locations;
  }

  protected async addCourts(locations: Map<string, Location>) {
    const csvCourts = await csvToArray<ICsvCourt[]>(await this.mdb.toCsv('Court'));
    const c = csvCourts.map(r => {
      return {
        ...r,
        locationId: locations.get(r.location).id,
        id: undefined
      };
    });
    const dbCourts = await Court.bulkCreate(
      c,
      { returning: true, ignoreDuplicates: true } // Return ALL comulms
    );

    const courts = new Map<string, Court>();
    for (const [i, court] of csvCourts.entries()) {
      courts.set(court.id, dbCourts[i]);
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

  protected async addEventFromImporterFile(importerFile: ImporterFile) {
    const foundEvent = await Event.findOne({
      where: {
        name: importerFile.name,
        uniCode: importerFile.uniCode,
        firstDay: importerFile.firstDay,
        dates: importerFile.dates,
        toernamentNumber: importerFile.toernamentNumber,
        type: this.type
      },
      include: [{ model: SubEvent }]
    });

    if (foundEvent) {
      return foundEvent;
    }

    const dbEvent = await Event.build({
      name: importerFile.name,
      uniCode: importerFile.uniCode,
      firstDay: importerFile.firstDay,
      dates: importerFile.dates,
      toernamentNumber: importerFile.toernamentNumber,
      type: this.type
    }).save();

    const subEvents = importerFile?.subEvents.map(subEvent => {
      return {
        ...subEvent.toJSON(),
        id: null,
        EventId: dbEvent.id
      };
    });

    dbEvent.subEvents = await SubEvent.bulkCreate(subEvents, { returning: true });

    return dbEvent;
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
    const csvEvents = await csvToArray<ICsvEvent[]>(await this.mdb.toCsv('Event'));
    const csvDraws = await csvToArray<ICsvDraw[]>(await this.mdb.toCsv('Draw'));
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

          return { player, playerId: csvPlayer.id };
        }
      })
    ).filter(
      (thing, i, arr) => arr.findIndex(t => t.player.memberId === thing.player.memberId) === i
    );

    const p = csvPlayers.map(x => {
      return { ...x.player };
    });
    const dbPlayers = await Player.bulkCreate(
      p,
      { returning: true, updateOnDuplicate: ['memberId'] } // Return ALL comulms
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
        { returning: true, ignoreDuplicates: true } // Return ALL comulms
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
    return csvToArray(await this.mdb.toCsv('Club'));
  }

  protected abstract addGames(
    subEvents: SubEvent[],
    players: TpPlayer[],
    courts: Map<string, Court>
  );

  /// Helper functions
  protected isElkGeslacht(gender) {
    return gender === 6;
  }

  protected getEventType(gender) {
    if (gender === 3 || gender === 6) {
      return 'MX';
    } else if (gender === 2 || gender === 5) {
      return 'F';
    } else if (gender === 1 || gender === 4) {
      return 'M';
    }

    throw new Error(`Got unexpected eventType. Params; gender:${gender}`);
  }

  protected getGameType(eventtype, gender) {
    if (gender === 3) {
      return 'MX';
    }

    switch (eventtype) {
      case '1':
        return 'S';
      case '2':
        return 'D';
      default:
        logger.warn(`Unsupported gameType ${eventtype}`);
    }
  }

  protected getDrawType(drawtype) {
    if (drawtype === 1) {
      return 'KO';
    } else if (drawtype === 2 || drawtype === 4) {
      return 'POULE';
    } else if (drawtype === 6) {
      return 'QUALIFICATION';
    }
    throw new Error(`Got unexpected drawType. Params; drawtype:${drawtype}`);
  }

  protected getLeague(importedFile: ImporterFile) {
    if (
      importedFile.fileLocation.indexOf('vlaanderen') === -1 &&
      importedFile.fileLocation.indexOf('nationaal') === -1
    ) {
      return 'PROV';
    } else {
      return importedFile.fileLocation.indexOf('vlaanderen') !== -1 ? 'LIGA' : 'NATIONAAL';
    }
  }
}

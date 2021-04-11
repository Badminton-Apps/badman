import {
  DataBaseHandler,
  ImporterFile,
  EventTournament,
  SubEventTournament,
  DrawTournament,
  Game,
  Player,
  EventImportType
} from '@badvlasim/shared';
import { join } from 'path';
import { TournamentTpProcessor } from '../processors';
import { Readable } from 'stream';
import { readFileSync } from 'fs';

jest.mock('child_process', () => {
  return {
    spawn: (exe: string, args: any[]) => {
      if (exe == 'mdb-export') {
        // Basically we write each column to a different file and append the column name to the filename
        // e.g:
        //  - file: competition.cp
        //  - column: Settings
        //  - outputFile: competition.cp_Settings
        const file = readFileSync(`${args[0]}_${args[1]}`, { encoding: 'utf-8' });

        const readableStream = Readable.from(file);
        return {
          stdout: readableStream,
          stderr: readableStream
        };
      } else {
        console.log('Got new one', exe);
      }
    }
  };
});

describe('tournament', () => {
  let databaseService: DataBaseHandler;
  let service: TournamentTpProcessor;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/tournament.tp');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new TournamentTpProcessor();
  });

  beforeEach(async () => {
    jest.setTimeout(100000);
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('Should immport tournamnet', async () => {
    // Arrange

    // Act
    await service.importFile(fileLocation);

    // Assert
    const importerFiles = await ImporterFile.findAll();
    expect(importerFiles.length).toBe(1);
    const importerFile = importerFiles[0];
    expect(importerFile.name).toEqual('Flemish Summer Event 2018');
    expect(importerFile.linkCode).toEqual('A8B820C0-2238-42B0-98B6-47167382407D');
    expect(importerFile.uniCode).toEqual('201806081635284500');
    expect(importerFile.dates).toEqual('2018-08-10T22:00:00.000Z,2018-08-11T22:00:00.000Z');
    expect(importerFile.firstDay).toEqual(new Date('2018-08-10T22:00:00.000Z'));
  });

  it('Should add tournamnet', async () => {
    // Arrange
    const importFile = await new ImporterFile({
      name: 'Flemish Summer Event 2018',
      fileLocation,
      firstDay: new Date(),
      type: EventImportType.TOURNAMENT
    }).save();
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service.import(importFile, { transaction });
    await transaction.commit();

    // Assert
    const event = await EventTournament.findOne({
      include: [
        {
          model: SubEventTournament,
          include: [
            {
              model: DrawTournament,
              order: ['name']
            }
          ],
          order: ['name']
        }
      ]
    } as any);

    const games = await Game.findAll({
      include: [{ model: Player }]
    });

    const players = await Player.findAll({
      order: ['firstName'],
      include: [Game]
    });

    expect(players.length).toBe(449);
    expect(event.name).toBe('Flemish Summer Event 2018');
    expect(event.subEvents.length).toBe(30);

    expect(games.length).toBe(827);
  });

  it.skip('Should re-add tournamnet', async () => {
    // Arrange
    const importFile = await new ImporterFile({
      name: 'Flemish Summer Event 2018',
      firstDay: new Date(),
      type: EventImportType.TOURNAMENT,
      fileLocation
    }).save();
    await service.import(importFile);
    const event = await EventTournament.findOne();

    // Act
    await service.import(importFile, { event });

    // Assert
    const dbEvent = await EventTournament.findOne({
      include: [
        {
          model: SubEventTournament,
          include: [
            {
              model: DrawTournament,
              order: ['name']
            }
          ],
          order: ['name']
        }
      ]
    } as any);

    const games = await Game.findAll({
      include: [{ model: Player }]
    });

    const players = await Player.findAll({
      order: ['firstName'],
      include: [Game]
    });

    expect(players.length).toBe(449);
    expect(dbEvent.name).toBe('Flemish Summer Event 2018');
    expect(dbEvent.subEvents.length).toBe(30);

    expect(games.length).toBe(827);
  });
});

describe('tournament 2', () => {
  let databaseService: DataBaseHandler;
  let service: TournamentTpProcessor;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/tournament_2.tp');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new TournamentTpProcessor();
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('Should import tournamnet', async () => {
    // Arrange
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service.importFile(fileLocation, transaction);
    await transaction.commit();

    // Assert
    const importerFiles = await ImporterFile.findAll();
    expect(importerFiles.length).toBe(1);
    const importerFile = importerFiles[0];
    expect(importerFile.name).toEqual('test');
    expect(importerFile.uniCode).toEqual('202102091127354687');
    expect(importerFile.dates).toEqual('2021-02-08T23:00:00.000Z');
    expect(importerFile.firstDay).toEqual(new Date('2021-02-08T23:00:00.000Z'));
  });

  it('Should add tournamnet', async () => {
    // Arrange
    const importFile = await new ImporterFile({
      name: 'test',
      fileLocation,
      firstDay: new Date(),
      type: EventImportType.TOURNAMENT
    }).save();
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service.import(importFile, { transaction });
    await transaction.commit();

    // Assert
    const event = await EventTournament.findOne({
      include: [
        {
          model: SubEventTournament,
          include: [
            {
              model: DrawTournament,
              order: ['name']
            }
          ],
          order: ['name']
        }
      ]
    } as any);

    const games = await Game.findAll({
      include: [{ model: Player }]
    });

    const players = await Player.findAll({
      order: ['firstName'],
      include: [Game]
    });

    expect(players.length).toBe(5);
    expect(event.name).toBe('test');
    expect(event.subEvents.length).toBe(2);

    expect(games.length).toBe(16);

    expect(players[0].firstName).toEqual('Speler 1');
    expect(players[0].lastName).toEqual('Test');
    expect(players[0].games.length).toEqual(4);

    expect(players[1].firstName).toEqual('Speler 2');
    expect(players[1].lastName).toEqual('Test');
    expect(players[1].games.length).toEqual(4);

    expect(players[2].firstName).toEqual('Speler 3');
    expect(players[2].lastName).toEqual('Test');
    expect(players[2].games.length).toEqual(4);

    expect(players[3].firstName).toEqual('Speler 4');
    expect(players[3].lastName).toEqual('Test');
    expect(players[3].games.length).toEqual(3);

    expect(players[4].firstName).toEqual('Speler 5');
    expect(players[4].lastName).toEqual('Test');
    expect(players[4].games.length).toEqual(3);
  });
});

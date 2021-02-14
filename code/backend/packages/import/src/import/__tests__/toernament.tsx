import { join } from 'path';
import { Transaction } from 'sequelize/types';
import {
  DataBaseHandler,
  Draw,
  Event,
  Game,
  GamePlayer,
  ImporterFile,
  ImportSubEvent,
  logger,
  Player,
  SubEvent
} from '../../../../_shared';
import { Mdb } from '../../convert/mdb';
import { TournamentImporter } from '../importers';

describe('Tournament 1', () => {
  let databaseService: DataBaseHandler;
  let service: TournamentImporter;
  let fileLocation: string;
  let transaction: Transaction;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/tournament.tp');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    await DataBaseHandler.sequelizeInstance.sync({ force: true });

    service = new TournamentImporter(new Mdb(fileLocation), null);
  });

  it('Should have initialized correctly', async () => {
    // Arrange

    // Act
    await service.addImporterfile(fileLocation);

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
    jest.setTimeout(100000);
    const importerFile = await service.addImporterfile(fileLocation);

    // Act
    await service.addEvent(importerFile);

    // Assert
    const event = await Event.findOne({
      include: [SubEvent]
    } as any);

    const players = await Player.findAndCountAll();

    expect(event.name).toBe('Flemish Summer Event 2018');
    expect(players.count).toBe(449);
    expect(event.subEvents.length).toBe(60);
  });
});

describe('Tournament 2', () => {
  let databaseService: DataBaseHandler;
  let service: TournamentImporter;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/tournament_2.tp');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new TournamentImporter(new Mdb(fileLocation), null);
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('Should have initialized correctly', async () => {
    // Arrange

    // Act
    await service.addImporterfile(fileLocation);

    // Assert
    const importerFiles = await ImporterFile.findAll();
    expect(importerFiles.length).toBe(1);
    const importerFile = importerFiles[0];
    expect(importerFile.name).toBe('test');
    expect(importerFile.uniCode).toEqual('202102091127354687');
    expect(importerFile.dates).toEqual('2021-02-08T23:00:00.000Z');
    expect(importerFile.firstDay).toEqual(new Date('2021-02-08T23:00:00.000Z'));
  });

  it.only('Should add tournamnet', async () => {
    // Arrange
    jest.setTimeout(100000);
    const importerFile = await service.addImporterfile(fileLocation);

    // Act
    await service.addEvent(importerFile);

    // Assert
    const event = await Event.findOne({
      include: [
        {
          model: SubEvent,
          include: [
            {
              model: Draw,
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

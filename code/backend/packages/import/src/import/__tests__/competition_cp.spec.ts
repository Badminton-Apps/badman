import {
  DataBaseHandler,
  EncounterCompetition,
  EventCompetition,
  EventImportType,
  Game,
  ImporterFile,
  LevelType,
  Player,
  SubEventCompetition,
  SubEventType,
  Team
} from '@badvlasim/shared';
import { join } from 'path';
import { CompetitionCpProcessor } from '../processors';
import { Readable } from 'stream';
import { readFileSync } from 'fs';

// We can't read settings in
jest.mock('child_process', () => {
  return {
    spawn: (exe: string, args: string[]) => {
      if (exe === 'mdb-export') {
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
      }
    }
  };
});

describe('competition cp', () => {
  let service: CompetitionCpProcessor;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(__dirname, 'files/competition.cp');

    new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new CompetitionCpProcessor();
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('Should import competition cp', async () => {
    // Arrange
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service.importFile(fileLocation, transaction);
    await transaction.commit();

    // Assert
    const importerFiles = await ImporterFile.findAll();
    expect(importerFiles.length).toBe(1);
    const importerFile = importerFiles[0];
    expect(importerFile.name).toEqual('Victor League 2019-2020');
    expect(importerFile.firstDay.toISOString()).toEqual('2019-09-27T22:00:00.000Z');
  });

  it('should add competition cp', async () => {
    // Arrange
    const importFile = await new ImporterFile({
      name: 'test',
      fileLocation,
      firstDay: new Date(),
      type: EventImportType.COMPETITION_CP
    }).save();

    // Act
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    await service.import(importFile, { transaction });
    await transaction.commit();

    // Assert
    const games = await Game.findAll({});
    const players = await Player.findAll({});
    const player = await Player.findOne({
      where: {
        memberId: '30047774'
      },
      include: [Game]
    });
    const teams = await Team.findAll({});
    const encounters = await EncounterCompetition.findAll({});

    expect(encounters.length).toEqual(84);
    expect(games.length).toEqual(481);
    expect(players.length).toEqual(144);
    expect(teams.length).toEqual(16);
    expect(player).not.toBeNull();
    expect(player.games.length).toBeGreaterThan(0);
  });
});

describe('competition cp 2', () => {
  let service: CompetitionCpProcessor;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(__dirname, 'files/competition2.cp');

    new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new CompetitionCpProcessor();
  });

  beforeEach(async () => {
    jest.setTimeout(100000);
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  it('Should import competition cp', async () => {
    // Arrange

    // Act
    await service.importFile(fileLocation);

    // Assert
    const importerFiles = await ImporterFile.findAll();
    expect(importerFiles.length).toBe(1);
    const importerFile = importerFiles[0];
    expect(importerFile.name).toEqual('PBA competitie 2021-2022');
    expect(importerFile.firstDay.toISOString()).toEqual('2021-08-31T22:00:00.000Z');
  });

  it.skip('should re-add competition cp', async () => {
    // Arrange
    const importFile = await new ImporterFile({
      name: 'PBA competitie 2021-2022',
      fileLocation,
      firstDay: new Date(),
      type: EventImportType.COMPETITION_CP
    }).save();
    await service.import(importFile);
    const event = await EventCompetition.findOne();
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service.import(importFile, { transaction, event });

    // Assert
    const subEvents = await SubEventCompetition.findAll({
      order: [
        ['eventType', 'asc'],
        ['level', 'asc']
      ]
    });

    expect(event.name).toEqual('PBA competitie 2021-2022');
    expect(event.type).toEqual(LevelType.PROV);

    expect(subEvents.length).toEqual(13);
    expect(subEvents[0].name).toEqual('1e Provinciale');
    expect(subEvents[0].eventType).toEqual(SubEventType.F);

    expect(subEvents[1].name).toEqual('2e Provinciale');
    expect(subEvents[2].name).toEqual('3e Provinciale');

    expect(subEvents[3].name).toEqual('1e Provinciale');
    expect(subEvents[3].eventType).toEqual(SubEventType.M);
    expect(subEvents[4].name).toEqual('2e Provinciale');
    expect(subEvents[5].name).toEqual('3e Provinciale');
    expect(subEvents[6].name).toEqual('4e Provinciale');
    expect(subEvents[7].name).toEqual('5e Provinciale');

    expect(subEvents[8].name).toEqual('1e provinciale');
    expect(subEvents[8].eventType).toEqual(SubEventType.MX);
    expect(subEvents[9].name).toEqual('2e Provinciale');
    expect(subEvents[10].name).toEqual('3e Provinciale');
    expect(subEvents[11].name).toEqual('4e Provinciale');
    expect(subEvents[12].name).toEqual('5e Provinciale');
  });
});

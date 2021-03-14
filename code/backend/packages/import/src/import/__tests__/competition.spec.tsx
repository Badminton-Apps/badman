import { join } from 'path';
import { Transaction } from 'sequelize/types';
import {
  DataBaseHandler,
  EventCompetition,
  ImporterFile,
  Player,
  SubEventCompetition
} from '@badvlasim/shared';
import { Mdb } from '../../convert/mdb';
import { CompetitionCpImporter } from '../importers';

describe('Competition', () => {
  let databaseService: DataBaseHandler;
  let service: CompetitionCpImporter;
  let fileLocation: string;
  let transaction: Transaction;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/competition.cp');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new CompetitionCpImporter(new Mdb(fileLocation), transaction);
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
    expect(importerFile.name).toEqual('PBO competitie 2020 - 2021');
    expect(importerFile.uniCode).toEqual('202004202326186125');
    expect(importerFile.firstDay).toEqual(new Date('2020-08-31T22:00:00.000Z'));
  });

  it('Should add competition', async () => {
    // Arrange
    jest.setTimeout(100000);
    const importerFile = await service.addImporterfile(fileLocation);

    // Act
    await service.addEvent(importerFile);

    // Assert

    const event = await EventCompetition.findOne({
      include: [SubEventCompetition]
    });

    const players = await Player.findAndCountAll();
    const subevents = await SubEventCompetition.findAll();

    expect(players.count).toBe(0);
    expect(event.subEvents.length).toBe(13);
    expect(subevents.length).toBe(13);
  });
});

import {
  Club,
  DataBaseHandler,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  EventImportType,
  Game,
  ImporterFile,
  Player,
  Team
} from '@badvlasim/shared';
import { join } from 'path';
import { CompetitionXmlProcessor } from '../processors';

describe('competition xml', () => {
  let databaseService: DataBaseHandler;
  let service: CompetitionXmlProcessor;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/competition.xml');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });

    service = new CompetitionXmlProcessor();
  });

  beforeEach(async () => {
    jest.setTimeout(100000);
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
    expect(importerFile.name).toEqual('PBO competitie 2020 - 2021');
    expect(importerFile.firstDay.toISOString()).toEqual('2020-08-31T22:00:00.000Z');
  });

  it('should add competition', async () => {
    // Arrange
    jest.setTimeout(100000);
    const importFile = await new ImporterFile({
      name: 'test',
      fileLocation,
      firstDay: new Date(),
      type: EventImportType.COMPETITION_XML
    }).save();
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service.import(importFile, { transaction });
    await transaction.commit();

    // Assert
    const encounters = await EncounterCompetition.findAll({});
    const draws = await DrawCompetition.findAll({});
    const games = await Game.findAll({});
    const players = await Player.findAll({});
    const player = await Player.findOne({
      where: {
        memberId: '50104197'
      },
      include: [Game]
    });
    const teams = await Team.findAll({});
    const clubs = await Club.findAll({});

    expect(draws.length).toEqual(30);
    expect(encounters.length).toEqual(180);
    expect(clubs.length).toEqual(29);
    expect(teams.length).toEqual(204);
    expect(players.length).toEqual(803);
    expect(games.length).toEqual(1440);

    expect(player).not.toBeNull();
    expect(player.games.length).toBeGreaterThan(0);
  });

  it('should re-add competition', async () => {
    // Arrange
    const importFile = await new ImporterFile({
      name: 'test',
      fileLocation,
      firstDay: new Date(),
      type: EventImportType.COMPETITION_XML
    }).save();
    await service.import(importFile);
    const event = await EventCompetition.findOne();

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();

    // Act
    await service.import(importFile, { transaction, event });

    // Assert
    const encounters = await EncounterCompetition.findAll({});
    const draws = await DrawCompetition.findAll({});
    const games = await Game.findAll({});
    const players = await Player.findAll({});
    const player = await Player.findOne({
      where: {
        memberId: '50104197'
      },
      include: [Game]
    });
    const teams = await Team.findAll({});
    const clubs = await Club.findAll({});

    expect(draws.length).toEqual(30);
    expect(encounters.length).toEqual(180);
    expect(clubs.length).toEqual(29);
    expect(teams.length).toEqual(204);
    expect(players.length).toEqual(803);
    expect(games.length).toEqual(1440);

    expect(player).not.toBeNull();
    expect(player.games.length).toBeGreaterThan(0);
  });
});

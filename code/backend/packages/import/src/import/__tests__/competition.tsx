import { join } from 'path';
import { DataBaseHandler, Event, Game, logger, Player, SubEvent } from '../../../../_shared';
import { CompetitionCpImporter } from '../importers';

describe('Competition', () => {
  let databaseService: DataBaseHandler;
  let service: CompetitionCpImporter;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/competition.cp');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
    await databaseService.sync(true);
    service = new CompetitionCpImporter();
  });

  it('Should have initialized correctly', async () => {
    // Arrange

    // Act
    await service.addImporterfile(fileLocation);

    // Assert
    const importerFile = await databaseService.getImported();
    expect(importerFile.name).toEqual('PBO competitie 2020 - 2021');
    expect(importerFile.uniCode).toEqual('202004202326186125');
    expect(importerFile.firstDay).toEqual(new Date('2020-08-31T22:00:00.000Z'));
  });

  it('Should add competition', async () => {
    // Arrange
    await service.addImporterfile(fileLocation);
    const importerFile = await databaseService.getImported();

    // Act
    await service.addEvent(importerFile);

    // Assert
    const event = await Event.findOne({
      include: [
        {
          model: SubEvent,
          include: [{ model: Game, include: [{ model: Player }] }]
        }
      ]
    });
    const players = await Player.findAndCountAll();

    expect(players.count).toBe(0);
    expect(event.subEvents.length).toBe(31);
  });
});

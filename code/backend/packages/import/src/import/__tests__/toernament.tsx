import { join } from 'path';
import {
  DataBaseHandler,
  Event,
  Game,
  GamePlayer,
  logger,
  Player,
  SubEvent
} from '../../../../_shared';
import { TournamentImporter } from '../importers';

describe.only('Tournament', () => {
  let databaseService: DataBaseHandler;
  let service: TournamentImporter;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/tournament.tp');

    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
    await databaseService.sync(true);
    service = new TournamentImporter();
  });

  it('Should have initialized correctly', async () => {
    // Arrange

    // Act
    await service.addImporterfile(fileLocation);

    // Assert
    const importerFile = await databaseService.getImported();
    expect(importerFile.name).toEqual('Flemish Summer Event 2018');
    expect(importerFile.linkCode).toEqual('A8B820C0-2238-42B0-98B6-47167382407D');
    // expect(importerFile.webID).toEqual('234296');
    expect(importerFile.uniCode).toEqual('201806081635284500');
    // expect(importerFile.dates).toEqual('2018-08-10T22:00:00.000Z,2018-08-11T22:00:00.000Z');
    // expect(importerFile.firstDay).toEqual(new Date('2018-08-10T22:00:00.000Z'));
  });

  it('Should add tournamnet', async () => {
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
    const test = await GamePlayer.findAndCountAll();
    // logger.debug('Here we are', event.subEvents[0].toJSON());
    // logger.debug('Here we are', test.rows[0].toJSON());

    expect(event.name).toBe('Flemish Summer Event 2018');
    expect(players.count).toBe(449);
    expect(event.subEvents.length).toBe(28);
  });
});

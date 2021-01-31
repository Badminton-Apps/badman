import { join } from 'path';
import { Transaction } from 'sequelize/types';
import { DataBaseHandler, Event, Game, logger, Player, SubEvent } from '../../../../_shared';
import { Mdb } from '../../convert/mdb';
import { CompetitionCpImporter } from '../importers';

describe.skip('Competition', () => {
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

    await DataBaseHandler.sequelizeInstance.sync({ force: true });

    service = new CompetitionCpImporter(new Mdb(fileLocation), null);

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
    jest.setTimeout(100000);
    const importerFile = await service.addImporterfile(fileLocation);

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

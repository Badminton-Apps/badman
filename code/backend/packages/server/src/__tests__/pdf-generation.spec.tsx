import {
  Club,
  DataBaseHandler,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  LastRankingPlace,
  PdfService,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
  SubEventType,
  Team,
  TeamSubEventMembership,
  TeamSubEventMembershipBadmintonBvlMembershipMeta
} from '@badvlasim/shared';
import mock from 'mock-fs';
import moment from 'moment';
import path from 'path';

describe('PDF service', () => {
  let databaseService: DataBaseHandler;
  let pdfService: PdfService;

  beforeAll(async () => {
    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
    pdfService = new PdfService(databaseService);
    pdfService['_htmlToPdf'] = jest.fn().mockImplementation(() => Promise.resolve(null));
  });

  beforeEach(async () => {
    const logoLocation = path.resolve(
      __dirname + '../../../../_shared/services/pdf/assets/logo.png'
    );

    mock({
      [logoLocation]: 'logo'
    });
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  afterEach(mock.restore);

  it('Assembly pdf', async () => {
    // const systemId = await new RankingSystem({primary: true}).save();
    // Arrange
    const event = await new EventCompetition().save();
    const subevent = await new SubEventCompetition({ eventId: event.id }).save();
    const draw = await new DrawCompetition({ subeventId: subevent.id }).save();
    const encounter = await new EncounterCompetition({
      date: new Date('2021-01-01'),
      drawId: draw.id
    }).save();

    const club1 = await new Club({ name: 'Awesome Club1' }).save();
    const club2 = await new Club({ name: 'Awesome Club2' }).save();
    const team1 = await new Team({
      teamNumber: 1,
      type: SubEventType.MX,
      clubId: club1.id
    }).save();

    const team2 = await new Team({
      teamNumber: 1,
      type: SubEventType.MX,
      clubId: club2.id
    }).save();

    await new TeamSubEventMembership({
      teamId: team1.id,
      subEventId: subevent.id,
      meta: {
        teamIndex: 80,
        players: [
          { id: 'a19c2aee-4c63-467d-bf4e-4c6fd0d0eb08', single: 7, double: 6, mix: 7, gender: 'M' },
          { id: 'abcba15d-4993-40ae-bf74-ff2646f55b58', single: 7, double: 6, mix: 8, gender: 'F' },
          { id: '14d0baca-41c7-4001-9cda-f0662053a6eb', single: 7, double: 5, mix: 7, gender: 'M' },
          { id: '068ab337-acbe-4ea5-99b8-f56a387ab96a', single: 7, double: 6, mix: 7, gender: 'F' }
        ]
      } as TeamSubEventMembershipBadmintonBvlMembershipMeta
    }).save();

    console.log('inserting', { teamId: team1.id, subEventId: subevent.id });

    const captainPlayer = await new Player({
      firstName: 'John',
      lastName: 'Doe'
    }).save();

    const jan = await new Player({
      id: '14d0baca-41c7-4001-9cda-f0662053a6eb',
      firstName: 'Jan',
      lastName: 'Behets',
      memberId: '50030100',
      gender: 'M'
    }).save();

    await jan.setRankingPlaces([
      new RankingPlace({
        single: 7,
        double: 5,
        mix: 7,
        rankingDate: moment('2021-05-15').toDate()
      })
    ]);

    await jan.setLastRankingPlace(
      new LastRankingPlace({
        single: 7,
        double: 5,
        mix: 7,
        rankingDate: moment('2021-05-15').toDate()
      })
    );

    const niels = await new Player({
      id: 'a19c2aee-4c63-467d-bf4e-4c6fd0d0eb08',
      firstName: 'Niels',
      lastName: 'Blockhuys',
      memberId: '50030100',
      gender: 'M'
    }).save();

    await niels.setRankingPlaces([
      new RankingPlace({
        single: 7,
        double: 6,
        mix: 7,
        rankingDate: moment('2021-05-15').toDate()
      })
    ]);

    await niels.setLastRankingPlace(
      new LastRankingPlace({
        single: 7,
        double: 6,
        mix: 7,
        rankingDate: moment('2021-05-15').toDate()
      })
    );

    const sander = await new Player({
      firstName: 'Sander',
      lastName: 'Decubber',
      memberId: '50234021',
      gender: 'M'
    }).save();

    await sander.setRankingPlaces([
      new RankingPlace({
        single: 7,
        double: 8,
        mix: 9,
        rankingDate: moment('2021-05-15').toDate()
      })
    ]);

    await sander.setLastRankingPlace(
      new LastRankingPlace({
        single: 7,
        double: 8,
        mix: 9,
        rankingDate: moment('2021-05-15').toDate()
      })
    );

    const joke = await new Player({
      id: 'abcba15d-4993-40ae-bf74-ff2646f55b58',
      firstName: 'Joke',
      lastName: 'Van Wesemael',
      memberId: '50084260',
      gender: 'F'
    }).save();

    await joke.setRankingPlaces([
      new RankingPlace({
        single: 7,
        double: 6,
        mix: 8,
        rankingDate: moment('2021-05-15').toDate()
      })
    ]);

    await joke.setLastRankingPlace(
      new LastRankingPlace({
        single: 7,
        double: 6,
        mix: 8,
        rankingDate: moment('2021-05-15').toDate()
      })
    );

    const janne = await new Player({
      firstName: 'Janne',
      lastName: 'Meesters',
      memberId: '50100523',
      gender: 'F'
    }).save();

    await janne.setRankingPlaces([
      new RankingPlace({
        single: 8,
        double: 9,
        mix: 8,
        rankingDate: moment('2021-05-15').toDate()
      })
    ]);

    await janne.setLastRankingPlace(
      new LastRankingPlace({
        single: 8,
        double: 9,
        mix: 8,
        rankingDate: moment('2021-05-15').toDate()
      })
    );

    const mieke = await new Player({
      firstName: 'Mieke',
      lastName: 'De Wilde',
      memberId: '50050239',
      gender: 'F'
    }).save();

    await mieke.setRankingPlaces([
      new RankingPlace({
        single: 9,
        double: 7,
        mix: 7,
        rankingDate: moment('2021-05-15').toDate()
      })
    ]);

    await mieke.setLastRankingPlace(
      new LastRankingPlace({
        single: 9,
        double: 7,
        mix: 7,
        rankingDate: moment('2021-05-15').toDate()
      })
    );

    const karolien = await new Player({
      id: '068ab337-acbe-4ea5-99b8-f56a387ab96a',
      firstName: 'Karolien',
      lastName: 'Delcourte',
      memberId: '50055853',
      gender: 'F'
    }).save();

    await encounter.setHome(team1);
    await encounter.setAway(team2);

    // Act
    await pdfService.getTeamAssemblyPdf({
      captainId: captainPlayer.id,
      encounterId: encounter.id,
      teamId: team1.id,
      team: {
        single: [sander.id, niels.id, janne.id, mieke.id],
        double: [
          [jan.id, niels.id],
          [joke.id, janne.id],
          [mieke.id, jan.id],
          [sander.id, joke.id]
        ],
        subtitude: []
      }
    });

    // Assert
    expect(pdfService['_htmlToPdf']).toBeCalledWith(
      'assembly',
      {
        awayTeam: 'Awesome Club2 1G',
        homeTeam: 'Awesome Club1 1G',
        baseIndex: 80,
        captain: 'John Doe',
        date: '01-01-2021 01:00',
        doubles: [
          {
            player1: {
              ...jan.toJSON(),
              base: false,
              team: false
            },
            player2: {
              ...niels.toJSON(),
              base: false,
              team: false
            }
          },
          {
            player1: {
              ...joke.toJSON(),
              base: false,
              team: false
            },
            player2: {
              ...janne.toJSON(),
              base: false,
              team: false
            }
          },
          {
            player1: {
              ...mieke.toJSON(),
              base: false,
              team: false
            },
            player2: {
              ...jan.toJSON(),
              base: false,
              team: false
            }
          },
          {
            player1: {
              ...joke.toJSON(),
              base: false,
              team: false
            },
            player2: {
              ...sander.toJSON(),
              base: false,
              team: false
            }
          }
        ],
        event: 'Gemengd null',
        isHomeTeam: true,
        logo: 'data:image/png;base64, bG9nbw==',
        singles: [
          {
            ...sander.toJSON(),
            base: false,
            team: false
          },
          {
            ...niels.toJSON(),
            base: false,
            team: false
          },
          {
            ...janne.toJSON(),
            base: false,
            team: false
          },
          {
            ...mieke.toJSON(),
            base: false,
            team: false
          }
        ],
        subtitudes: [],
        teamIndex: 84,
        type: 'MX'
      },
      {
        format: 'a4',
        landscape: true,
        printBackground: true
      }
    );
  });
});

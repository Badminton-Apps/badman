/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/dot-notation */
import mock from 'mock-fs';
import moment from 'moment';
import path from 'path';
import {
  DataBaseHandler,
  PdfService,
  EventCompetition,
  SubEventCompetition,
  DrawCompetition,
  EncounterCompetition,
  Club,
  Team,
  SubEventType,
  TeamSubEventMembership,
  Player,
  RankingPlace,
  LastRankingPlace
} from '..';
import fakerator from 'fakerator';

const fake = fakerator();

describe('PDF service', () => {
  let databaseService: DataBaseHandler;
  let pdfService: PdfService;

  beforeAll(async () => {
    databaseService = new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
    pdfService = new PdfService(databaseService);
    pdfService['_htmlToPdf'] = jest
      .fn()
      .mockImplementation(() => Promise.resolve(null));
  });

  beforeEach(async () => {
    const logoLocation = path.resolve(
      __dirname + '/../services/pdf/assets/logo.png'
    );
    mock({
      [logoLocation]: 'logo'
    });
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  afterEach(mock.restore);

  it('Assembly pdf Mix', async () => {
    const fakeClub1Name = fake.names.name();
    const fakeClub2Name = fake.names.name();

    const fakeMPerson1 = {
      firstName: fake.names.firstNameM(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'M'
    };
    const fakeMPerson2 = {
      firstName: fake.names.firstNameM(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'M'
    };
    const fakeMPerson3 = {
      firstName: fake.names.firstNameM(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'M'
    };
    const fakeFPerson1 = {
      firstName: fake.names.firstNameF(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'F'
    };
    const fakeFPerson2 = {
      firstName: fake.names.firstNameF(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'F'
    };
    const fakeFPerson3 = {
      firstName: fake.names.firstNameF(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'F'
    };

    // const systemId = await new RankingSystem({primary: true}).save();
    // Arrange
    const encounterDate = moment('2021-01-01');
    const event = await new EventCompetition().save();
    const subevent = await new SubEventCompetition().save();
    const draw = await new DrawCompetition().save();
    const encounter = await new EncounterCompetition({
      date: encounterDate.toDate()
    }).save();

    await subevent.setEvent(event);
    await draw.setSubEvent(subevent);
    await encounter.setDraw(draw);

    const club1 = await new Club({ name: fakeClub1Name }).save();
    const club2 = await new Club({ name: fakeClub2Name }).save();
    const team1 = await new Team({
      teamNumber: 1,
      type: SubEventType.MX,
      clubId: club1.id
    }).save();

    const team2 = await new Team({
      teamNumber: 2,
      type: SubEventType.MX,
      clubId: club2.id
    }).save();

    await encounter.setHome(team1);
    await encounter.setAway(team2);

    const membership = new TeamSubEventMembership({
      teamId: team1.id,
      subEventId: subevent.id
    });

    membership.meta = {
      teamIndex: 80,
      players: [
        {
          id: 'c76f2327-dbf9-4de6-b314-42cb29012724',
          single: 7,
          double: 6,
          mix: 7,
          gender: 'M'
        },
        {
          id: '990a2e5c-4670-4053-9634-506d276ccc97',
          single: 7,
          double: 6,
          mix: 8,
          gender: 'F'
        },
        {
          id: '8c1c0a6b-d252-4d17-a5f8-e53cdeb4178a',
          single: 7,
          double: 5,
          mix: 7,
          gender: 'M'
        },
        {
          id: '96df9d4c-be58-4eaa-9d27-62b241b3000a',
          single: 7,
          double: 6,
          mix: 7,
          gender: 'F'
        }
      ]
    };
    await membership.save();

    const captainPlayer = await Player.create({
      firstName: 'John',
      lastName: 'Doe'
    });

    const playerM1 = await Player.create(
      {
        id: '8c1c0a6b-d252-4d17-a5f8-e53cdeb4178a',
        ...fakeMPerson1,
        rankingPlaces: [
          new RankingPlace({
            single: 7,
            double: 5,
            mix: 7,
            rankingDate: moment('2021-05-15').toDate()
          })
        ],
        lastRankingPlace: new LastRankingPlace({
          single: 7,
          double: 5,
          mix: 7,
          rankingDate: moment('2021-09-11').toDate()
        })
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerM2 = await Player.create(
      {
        id: 'c76f2327-dbf9-4de6-b314-42cb29012724',
        ...fakeMPerson2,
        rankingPlaces: [
          new RankingPlace({
            single: 7,
            double: 6,
            mix: 7,
            rankingDate: moment('2021-05-15').toDate()
          })
        ],
        lastRankingPlace: new LastRankingPlace({
          single: 7,
          double: 6,
          mix: 7,
          rankingDate: moment('2021-09-11').toDate()
        })
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerM3 = await Player.create(
      {
        ...fakeMPerson3,
        rankingPlaces: [
          new RankingPlace({
            single: 7,
            double: 8,
            mix: 9,
            rankingDate: moment('2021-05-15').toDate()
          })
        ],
        lastRankingPlace: new LastRankingPlace({
          single: 7,
          double: 8,
          mix: 9,
          rankingDate: moment('2021-09-11').toDate()
        })
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerF1 = await Player.create(
      {
        id: '990a2e5c-4670-4053-9634-506d276ccc97',
        ...fakeFPerson1,
        rankingPlaces: [
          new RankingPlace({
            single: 7,
            double: 6,
            mix: 8,
            rankingDate: moment('2021-05-15').toDate()
          })
        ],
        lastRankingPlace: new LastRankingPlace({
          single: 7,
          double: 6,
          mix: 8,
          rankingDate: moment('2021-09-11').toDate()
        })
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerF2 = await Player.create(
      {
        ...fakeFPerson2,
        rankingPlaces: [
          new RankingPlace({
            single: 8,
            double: 9,
            mix: 8,
            rankingDate: moment('2021-05-15').toDate()
          })
        ],
        lastRankingPlace: new LastRankingPlace({
          single: 8,
          double: 9,
          mix: 8,
          rankingDate: moment('2021-09-11').toDate()
        })
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerF3 = await Player.create(
      {
        ...fakeFPerson3,
        rankingPlaces: [
          new RankingPlace({
            single: 9,
            double: 8,
            mix: 7,
            rankingDate: moment('2021-05-15').toDate()
          })
        ],
        lastRankingPlace: new LastRankingPlace({
          single: 9,
          double: 7,
          mix: 7,
          rankingDate: moment('2021-09-11').toDate()
        })
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    // Act
    await pdfService.getTeamAssemblyPdf({
      captainId: captainPlayer.id,
      encounterId: encounter.id,
      teamId: team1.id,
      team: {
        single: [playerM3.id, playerM2.id, playerF2.id, playerF3.id],
        double: [
          [playerM1.id, playerM2.id],
          [playerF1.id, playerF2.id],
          [playerF3.id, playerM1.id],
          [playerF1.id, playerM3.id]
        ],
        subtitude: []
      }
    });

    // Assert
    // Static values
    expect(pdfService['_htmlToPdf']).toBeCalledWith(
      'assembly',
      expect.anything(),
      {
        format: 'a4',
        landscape: true,
        printBackground: true
      }
    );

    // Base options
    expect(pdfService['_htmlToPdf']).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        awayTeam: `${fakeClub2Name} 2G`,
        homeTeam: `${fakeClub1Name} 1G`,
        teamIndex: 84,
        baseIndex: 80,
        captain: 'John Doe',
        date: encounterDate.format('DD-MM-YYYY HH:mm'),
        type: 'MX'
      }),
      expect.anything()
    );

    // Singles
    expect(pdfService['_htmlToPdf']).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        singles: expect.arrayContaining([
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson3.memberId,
            fullName: `${fakeMPerson3.firstName} ${fakeMPerson3.lastName}`
          }),
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson2.memberId,
            fullName: `${fakeMPerson2.firstName} ${fakeMPerson2.lastName}`
          }),
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson2.memberId,
            fullName: `${fakeMPerson2.firstName} ${fakeMPerson2.lastName}`
          }),
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson3.memberId,
            fullName: `${fakeMPerson3.firstName} ${fakeMPerson3.lastName}`
          })
        ])
      }),
      expect.anything()
    );

    // Doubles
    expect(pdfService['_htmlToPdf']).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        doubles: expect.arrayContaining([
          {
            player1: expect.objectContaining({
              base: true,
              team: true,
              memberId: fakeMPerson1.memberId,
              fullName: `${fakeMPerson1.firstName} ${fakeMPerson1.lastName}`
            }),
            player2: expect.objectContaining({
              base: true,
              team: true,
              memberId: fakeMPerson2.memberId,
              fullName: `${fakeMPerson2.firstName} ${fakeMPerson2.lastName}`
            })
          },
          {
            player1: expect.objectContaining({
              base: true,
              team: true,
              memberId: fakeFPerson1.memberId,
              fullName: `${fakeFPerson1.firstName} ${fakeFPerson1.lastName}`
            }),
            player2: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeFPerson2.memberId,
              fullName: `${fakeFPerson2.firstName} ${fakeFPerson2.lastName}`
            })
          },
          {
            player1: expect.objectContaining({
              base: false,
              team: true,
              memberId: fakeFPerson3.memberId,
              fullName: `${fakeFPerson3.firstName} ${fakeFPerson3.lastName}`
            }),
            player2: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeMPerson1.memberId,
              fullName: `${fakeMPerson1.firstName} ${fakeMPerson1.lastName}`
            })
          },
          {
            player1: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeFPerson1.memberId,
              fullName: `${fakeFPerson1.firstName} ${fakeFPerson1.lastName}`
            }),
            player2: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeMPerson3.memberId,
              fullName: `${fakeMPerson3.firstName} ${fakeMPerson3.lastName}`
            })
          }
        ])
      }),
      expect.anything()
    );
  });
});
/* eslint-enable no-underscore-dangle*/
/* eslint-enable @typescript-eslint/dot-notation */

import mock from 'mock-fs';
import moment from 'moment';
import path from 'path';

import {
  EventCompetition,
  SubEventCompetition,
  DrawCompetition,
  EncounterCompetition,
  Club,
  Team,
  SubEventType,
  Player,
  RankingPlace,
  LastRankingPlace,
  RankingSystem,
  RankingSystems,
  StartingType,
  EventEntry,
} from '../models';

import fakerator from 'fakerator';
import { HandlebarService } from '../services';
import { DataBaseHandler } from '../database';

const fake = fakerator();

describe('PDF service', () => {
  let handlebarService: HandlebarService;

  beforeAll(async () => {
    new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:',
    });
    handlebarService = new HandlebarService();
    handlebarService['_getHtml'] = jest
      .fn()
      .mockImplementation(() => Promise.resolve(null));
  });

  beforeEach(async () => {
    const logoLocation = path.resolve(
      __dirname + '/../services/handlebars/assets/logo.png'
    );

    mock({
      [logoLocation]: 'logo',
    });
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  afterEach(mock.restore);

  it('Assembly pdf Mix', async () => {
    const rankingSystem = await new RankingSystem({
      name: 'BBF Rating',
      amountOfLevels: 12,
      procentWinning: 75,
      procentWinningPlus1: 50,
      procentLosing: 30,
      minNumberOfGamesUsedForUpgrade: 7,
      maxDiffLevels: 2,
      maxDiffLevelsHighest: null,
      latestXGamesToUse: null,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
      gamesForInactivty: 3,
      inactivityAmount: 103,
      inactivityUnit: 'weeks',
      caluclationIntervalLastUpdate: new Date('2021-11-14T23:00:00.000Z'),
      caluclationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      periodAmount: 104,
      periodUnit: 'weeks',
      updateIntervalAmountLastUpdate: new Date('2018-03-01T23:00:00.000Z'),
      updateIntervalAmount: 2,
      updateIntervalUnit: 'months',
      rankingSystem: RankingSystems.VISUAL,
      primary: true,
      runCurrently: false,
      runDate: new Date('2021-04-21T07:30:13.173Z'),
      differenceForUpgrade: 1,
      differenceForDowngrade: 0,
      startingType: StartingType.tableLFBB,
    }).save();

    const fakeClub1Name = fake.names.name();
    const fakeClub2Name = fake.names.name();

    const fakeMPerson1 = {
      firstName: fake.names.firstNameM(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'M',
    };
    const fakeMPerson2 = {
      firstName: fake.names.firstNameM(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'M',
    };
    const fakeMPerson3 = {
      firstName: fake.names.firstNameM(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'M',
    };
    const fakeFPerson1 = {
      firstName: fake.names.firstNameF(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'F',
    };
    const fakeFPerson2 = {
      firstName: fake.names.firstNameF(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'F',
    };
    const fakeFPerson3 = {
      firstName: fake.names.firstNameF(),
      lastName: fake.names.lastName(),
      memberId: fake.populate('########'),
      gender: 'F',
    };

    // Arrange
    const encounterDate = moment('2021-10-01');
    const event = await new EventCompetition({ startYear: 2021 }).save();
    const subevent = await new SubEventCompetition().save();
    const draw = await new DrawCompetition().save();
    const encounter = await new EncounterCompetition({
      date: encounterDate.toDate(),
    }).save();

    await subevent.setEvent(event);
    await draw.setSubEvent(subevent);
    await encounter.setDraw(draw);

    const club1 = await new Club({ name: fakeClub1Name }).save();
    const club2 = await new Club({ name: fakeClub2Name }).save();
    const team1 = await new Team({
      teamNumber: 1,
      type: SubEventType.MX,
      clubId: club1.id,
    }).save();

    const team2 = await new Team({
      teamNumber: 2,
      type: SubEventType.MX,
      clubId: club2.id,
    }).save();

    await encounter.setHome(team1);
    await encounter.setAway(team2);

    const eventEntry = new EventEntry({
      teamId: team1.id,
      subEventId: subevent.id,
    });
    eventEntry.meta = {
      competition: {
        teamIndex: 80,
        players: [
          {
            id: 'c76f2327-dbf9-4de6-b314-42cb29012724',
            single: 7,
            double: 6,
            mix: 7,
            gender: 'M',
          },
          {
            id: '990a2e5c-4670-4053-9634-506d276ccc97',
            single: 7,
            double: 6,
            mix: 8,
            gender: 'F',
          },
          {
            id: '8c1c0a6b-d252-4d17-a5f8-e53cdeb4178a',
            single: 7,
            double: 5,
            mix: 7,
            gender: 'M',
          },
          {
            id: '96df9d4c-be58-4eaa-9d27-62b241b3000a',
            single: 7,
            double: 6,
            mix: 7,
            gender: 'F',
          },
        ],
      },
    };
    await eventEntry.save();

    const captainPlayer = await Player.create({
      firstName: 'John',
      lastName: 'Doe',
    });

    const playerM1 = await Player.create(
      {
        id: '8c1c0a6b-d252-4d17-a5f8-e53cdeb4178a',
        ...fakeMPerson1,
        rankingPlaces: [
          new RankingPlace({
            SystemId: rankingSystem.id,
            single: 7,
            double: 5,
            mix: 7,
            rankingDate: moment('2021-05-15').toDate(),
          }),
        ],
        lastRankingPlaces: [
          new LastRankingPlace({
            systemId: rankingSystem.id,
            single: 7,
            double: 5,
            mix: 7,
            rankingDate: moment('2021-09-11').toDate(),
          }),
        ],
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerM2 = await Player.create(
      {
        id: 'c76f2327-dbf9-4de6-b314-42cb29012724',
        ...fakeMPerson2,
        rankingPlaces: [
          new RankingPlace({
            SystemId: rankingSystem.id,
            single: 7,
            double: 6,
            mix: 7,
            rankingDate: moment('2021-05-15').toDate(),
          }),
        ],
        lastRankingPlaces: [
          new LastRankingPlace({
            systemId: rankingSystem.id,
            single: 7,
            double: 6,
            mix: 7,
            rankingDate: moment('2021-09-11').toDate(),
          }),
        ],
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerM3 = await Player.create(
      {
        id: '387637da-7b97-4716-871f-eb2d81e0563e',
        ...fakeMPerson3,
        rankingPlaces: [
          new RankingPlace({
            SystemId: rankingSystem.id,
            single: 7,
            double: 8,
            mix: 9,
            rankingDate: moment('2021-05-15').toDate(),
          }),
        ],
        lastRankingPlaces: [
          new LastRankingPlace({
            systemId: rankingSystem.id,
            single: 7,
            double: 8,
            mix: 9,
            rankingDate: moment('2021-09-11').toDate(),
          }),
        ],
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerF1 = await Player.create(
      {
        id: '990a2e5c-4670-4053-9634-506d276ccc97',
        ...fakeFPerson1,
        rankingPlaces: [
          new RankingPlace({
            SystemId: rankingSystem.id,
            single: 7,
            double: 6,
            mix: 8,
            rankingDate: moment('2021-05-15').toDate(),
          }),
        ],
        lastRankingPlaces: [
          new LastRankingPlace({
            systemId: rankingSystem.id,
            single: 7,
            double: 6,
            mix: 8,
            rankingDate: moment('2021-09-11').toDate(),
          }),
        ],
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerF2 = await Player.create(
      {
        id: 'f4a7b889-ac6b-4a94-8e48-88fc1ac37175',
        ...fakeFPerson2,
        rankingPlaces: [
          new RankingPlace({
            SystemId: rankingSystem.id,
            single: 8,
            double: 9,
            mix: 8,
            rankingDate: moment('2021-05-15').toDate(),
          }),
        ],
        lastRankingPlaces: [
          new LastRankingPlace({
            systemId: rankingSystem.id,
            single: 8,
            double: 9,
            mix: 8,
            rankingDate: moment('2021-09-11').toDate(),
          }),
        ],
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    const playerF3 = await Player.create(
      {
        id: 'bbdbd15e-8a36-4959-acfd-699ab213c121',
        ...fakeFPerson3,
        rankingPlaces: [
          new RankingPlace({
            id: fake.misc.uuid(),
            SystemId: rankingSystem.id,
            single: 9,
            double: 8,
            mix: 7,
            rankingDate: moment('2021-05-15').toDate(),
          }),
        ],
        lastRankingPlaces: [
          new LastRankingPlace({
            systemId: rankingSystem.id,
            single: 9,
            double: 7,
            mix: 7,
            rankingDate: moment('2021-09-11').toDate(),
          }),
        ],
      },
      { include: [RankingPlace, LastRankingPlace] }
    );

    // Act
    await handlebarService.getTeamAssemblyPdf({
      captainId: captainPlayer.id,
      encounterId: encounter.id,
      teamId: team1.id,
      team: {
        single: [playerM3.id, playerM2.id, playerF2.id, playerF3.id],
        double: [
          [playerM1.id, playerM2.id],
          [playerF1.id, playerF2.id],
          [playerF3.id, playerM1.id],
          [playerF1.id, playerM3.id],
        ],
        subtitude: [],
      },
    });

    // Assert
    // Static values
    expect(handlebarService['_getHtml']).toBeCalledWith(
      'assembly',
      expect.anything()
    );

    // Base options
    expect(handlebarService['_getHtml']).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        awayTeam: `${fakeClub2Name} 2G`,
        homeTeam: `${fakeClub1Name} 1G`,
        teamIndex: 84,
        baseIndex: 80,
        captain: 'John Doe',
        date: encounterDate.format('DD-MM-YYYY HH:mm'),
        type: 'MX',
      })
    );

    // Singles
    expect(handlebarService['_getHtml']).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        singles: expect.arrayContaining([
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson3.memberId,
            fullName: `${fakeMPerson3.firstName} ${fakeMPerson3.lastName}`,
          }),
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson2.memberId,
            fullName: `${fakeMPerson2.firstName} ${fakeMPerson2.lastName}`,
          }),
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson2.memberId,
            fullName: `${fakeMPerson2.firstName} ${fakeMPerson2.lastName}`,
          }),
          expect.objectContaining({
            base: false,
            team: false,
            memberId: fakeMPerson3.memberId,
            fullName: `${fakeMPerson3.firstName} ${fakeMPerson3.lastName}`,
          }),
        ]),
      })
    );

    // Doubles
    expect(handlebarService['_getHtml']).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        doubles: expect.arrayContaining([
          {
            player1: expect.objectContaining({
              base: true,
              team: true,
              memberId: fakeMPerson1.memberId,
              fullName: `${fakeMPerson1.firstName} ${fakeMPerson1.lastName}`,
            }),
            player2: expect.objectContaining({
              base: true,
              team: true,
              memberId: fakeMPerson2.memberId,
              fullName: `${fakeMPerson2.firstName} ${fakeMPerson2.lastName}`,
            }),
          },
          {
            player1: expect.objectContaining({
              base: true,
              team: true,
              memberId: fakeFPerson1.memberId,
              fullName: `${fakeFPerson1.firstName} ${fakeFPerson1.lastName}`,
            }),
            player2: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeFPerson2.memberId,
              fullName: `${fakeFPerson2.firstName} ${fakeFPerson2.lastName}`,
            }),
          },
          {
            player1: expect.objectContaining({
              base: false,
              team: true,
              memberId: fakeFPerson3.memberId,
              fullName: `${fakeFPerson3.firstName} ${fakeFPerson3.lastName}`,
            }),
            player2: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeMPerson1.memberId,
              fullName: `${fakeMPerson1.firstName} ${fakeMPerson1.lastName}`,
            }),
          },
          {
            player1: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeFPerson1.memberId,
              fullName: `${fakeFPerson1.firstName} ${fakeFPerson1.lastName}`,
            }),
            player2: expect.objectContaining({
              base: false,
              team: false,
              memberId: fakeMPerson3.memberId,
              fullName: `${fakeMPerson3.firstName} ${fakeMPerson3.lastName}`,
            }),
          },
        ]),
      })
    );
  });
});

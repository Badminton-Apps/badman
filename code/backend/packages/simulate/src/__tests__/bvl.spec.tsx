import { DataBaseHandler } from '@badvlasim/shared/database/databse.service';
import {
  Game,
  GameType,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystems
} from '@badvlasim/shared/models';
import { MockObj } from '@badvlasim/shared/testing/mock-obj';
import { generatePoints } from '@badvlasim/shared/testing/utils';
import moment from 'moment';
import { BvlRankingCalc } from '../models';

jest.mock('@badvlasim/shared/models/sequelize/ranking-system.model');

describe('bvl', () => {
  let mockDatabaseService: MockObj<DataBaseHandler>;

  describe('BV 80 20 15', () => {
    let service: BvlRankingCalc;

    beforeAll(() => {
      service = new BvlRankingCalc(
        {
          name: '',
          amountOfLevels: 12,
          id: 1,
          caluclationIntervalAmount: 3,
          calculationIntervalUnit: 'months',
          updateIntervalAmount: 52,
          updateIntervalUnit: 'weeks',
          procentWinning: 80,
          procentWinningPlus1: 50,
          procentLosing: 20,
          minNumberOfGamesUsedForUpgrade: 7,
          maxDiffLevels: 2,
          maxDiffLevelsHighest: 3,
          latestXGamesToUse: 15,
          differenceForUpgrade: 1,
          differenceForDowngrade: 0,
          maxLevelDownPerChange: 1,
          gamesForInactivty: 3,
          rankingSystem: RankingSystems.BVL
        } as RankingSystem,
        mockDatabaseService as DataBaseHandler
      );
    });

    test('Test point caps', () => {
      expect(service.rankingType.pointsToGoUp).toStrictEqual([
        40, // to 11
        64, // to 10
        102.4, // to 9
        163.84, // to 8
        262.144, // to 7
        419.4304, // to 6
        671.08864, // to 5
        1073.741824, // to 4
        1717.9869184,
        2748.77906944,
        4398.046511103999
      ]);
      expect(service.rankingType.pointsToGoDown).toStrictEqual([
        16,
        25.6,
        40.96,
        65.536,
        104.8576,
        167.77216,
        268.435456,
        429.4967296,
        687.19476736,
        1099.5116277759998,
        1759.2186044415998
      ]);
      expect(service.rankingType.pointsWhenWinningAgainst).toStrictEqual([
        50,
        80,
        128,
        204.8,
        327.68,
        524.288,
        838.8608,
        1342.17728,
        2147.483648,
        3435.9738368,
        5497.55813888,
        8796.093022207999
      ]);
    });

    describe('find new ranking level', () => {
      test('Points for upgrading 2 levels, not limited by rules to 1, low level', () => {
        // Arrange
        const currentLevel = 12;
        const findPointsDowngrade = 85;
        const findPointsUpgrade = 75;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(10);
      });
      test('Points for upgrading 2 levels, not limited by rules to 1, high level', () => {
        // Arrange
        const currentLevel = 3;
        const findPointsDowngrade = 4650;
        const findPointsUpgrade = 4500;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(1);
      });
      test('Points for upgrading 1 level, low level', () => {
        // Arrange
        const currentLevel = 12;
        const findPointsDowngrade = 60;
        const findPointsUpgrade = 50;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(11);
      });
      test('Points for upgrading 1 level, high level', () => {
        // Arrange
        const currentLevel = 3;
        const findPointsDowngrade = 3150;
        const findPointsUpgrade = 3000;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(2);
      });
      test('Points for staying same level, low level', () => {
        // Arrange
        const currentLevel = 10;
        const findPointsDowngrade = 105;
        const findPointsUpgrade = 75;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(10);
      });
      test('Points for staying same level, high level', () => {
        // Arrange
        const currentLevel = 3;
        const findPointsDowngrade = 3000;
        const findPointsUpgrade = 2500;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(3);
      });
      test('Points for downgrading, low level', () => {
        // Arrange
        const currentLevel = 10;
        const findPointsDowngrade = 20;
        const findPointsUpgrade = 0;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(11);
      });
      test('Points for downgrading, high level', () => {
        // Arrange
        const currentLevel = 3;
        const findPointsDowngrade = 500;
        const findPointsUpgrade = 250;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(4);
      });
      test('Points for downgrading 2 levels, limited by rules to 1, low level', () => {
        // Arrange
        const currentLevel = 10;
        const findPointsDowngrade = 15;
        const findPointsUpgrade = 5;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(11);
      });
      test('Points for downgrading 2 levels, limited by rules to 1, high level', () => {
        // Arrange
        const currentLevel = 3;
        const findPointsDowngrade = 350;
        const findPointsUpgrade = 200;

        // Act
        const newRanking = service.findRanking(
          findPointsUpgrade,
          findPointsDowngrade,
          currentLevel
        );

        // Assert
        expect(newRanking).toBe(4);
      });
    });
    describe('Get points for upgrading', () => {
      test('More than 7 matches', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 130, 205)];

        // Act
        const findPointsUpgrade = service.findPointsBetterAverage(points);

        // Assert
        expect(findPointsUpgrade).toBe(118);
      });
      test('Less than 7 and more than 1 match', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 0, 130, 205, 130)];

        // Act
        const findPointsUpgrade = service.findPointsBetterAverage(points);

        // Assert
        expect(findPointsUpgrade).toBe(85);
      });
      test('Less than 2 matches', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 130)];

        // Act
        const findPointsUpgrade = service.findPointsBetterAverage(points);

        // Assert
        expect(findPointsUpgrade).toBe(19);
      });
    });
    describe('Get downgrade points', () => {
      test('More than 7 matches', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 130, 205)];
        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);

        // Assert
        expect(findPointsDowngrade).toBe(118);
      });
      test('Less than 7 and more than 1 match', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 0, 130, 205, 130)];

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);

        // Assert
        expect(findPointsDowngrade).toBe(99);
      });
      test('Less than 2 matches', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 130)];

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);

        // Assert
        expect(findPointsDowngrade).toBe(130);
      });
    });
    describe('Combined upgrading/dowgnrading/find new ranking', () => {
      test('Test case 1', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 130, 205)];
        const currentLevel = 10;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(9);
      });
      test('Test case 2', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 130, 205)];
        const currentLevel = 11;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(9);
      });
      test('Test case 3', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 130, 205)];
        const currentLevel = 9;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(9);
      });
      test('Test case 4', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 130, 205)];
        const currentLevel = 6;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(7);
      });
      test('Test case 5', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 130, 205)];
        const currentLevel = 5;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(6);
      });
      test('Test case 6', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 0, 130, 205, 205)];

        const currentLevel = 9;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(9);
      });
      test('Test case 7', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 0, 130, 205, 205)];
        const currentLevel = 10;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(10);
      });
      test('Test case 8', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 0, 130, 205, 205)];
        const currentLevel = 11;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(10);
      });
      test('Test case 9', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 205, 0, 205, 205)];
        const currentLevel = 7;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(findPointsDowngrade).toBe(123);
        expect(findPointsUpgrade).toBe(88);
        expect(newLevel).toBe(7);
      });
      test('Test case 10', () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 0, 130, 205, 205)];
        const currentLevel = 6;

        // Act
        const findPointsDowngrade = service.findPointsBetterAverage(points, false);
        const findPointsUpgrade = service.findPointsBetterAverage(points);
        const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

        // Assert
        expect(newLevel).toBe(7);
      });
    });
    describe('combined with protections', () => {
      test('Test case with 3 periods ', async () => {
        // Arrange
        const points = [
          ...generatePoints(GameType.S, -1, 0),
          ...generatePoints(GameType.MX, -1, 3435, 0, 3435, 2145, 3435)
        ];
        const startRanking = {
          mix: 4,
          double: 4,
          single: 3
        } as RankingPlace;

        const inactive = {
          mix: false,
          double: false,
          single: false
        };

        // Period 1
        const newRanking1 = await service.findNewPlacePlayer(points, startRanking, inactive);

        // Period 2 same games (note 2nd value is now result of last)
        const newRanking2 = await service.findNewPlacePlayer(points, newRanking1, inactive);

        // Act
        const newRanking3 = await service.findNewPlacePlayer(points, newRanking2, inactive);

        // Assert
        expect(newRanking3.single).toBe(3);
        expect(newRanking3.double).toBe(4);
        expect(newRanking3.mix).toBe(3);
      });
      test('Normal upgrading', async () => {
        // Arrange
        const points = [...generatePoints(GameType.S, -1, 0, 130, 130, 0, 130, 205, 130, 205, 130)];
        const lastRanking = {
          mix: 10,
          double: 10,
          single: 10
        } as RankingPlace;
        const inactive = {
          mix: false,
          double: false,
          single: false
        };

        // Act
        const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

        // Assert
        expect(newRanking.single).toBe(9);
        expect(newRanking.double).toBe(10);
        expect(newRanking.mix).toBe(10);
      });
      test('Normal upgrading, avoid downgrading, change highest level', async () => {
        // Arrange
        const points = [
          // Games that count for downgrade
          ...generatePoints(GameType.S, -1, 0, 205, 330, 0, 330, 330),
          ...generatePoints(GameType.D, -1, 0, 0, 130, 0, 130, 205, 130),
          ...generatePoints(GameType.MX, -1, 0, 205, 330, 0, 205, 330, 330, 330),
          // Games that doesn't count for downgrade
          ...generatePoints(GameType.D, 3, 0, 0, 0, 0)
        ];
        const lastRanking = {
          mix: 9,
          double: 8,
          single: 9
        } as RankingPlace;
        const inactive = {
          mix: false,
          double: false,
          single: false
        };

        // Act
        const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

        // Assert
        expect(newRanking.single).toBe(8);
        expect(newRanking.double).toBe(9);
        expect(newRanking.mix).toBe(8);
      });
      test('Upgrading, 2 levels at once, avoid downgrading, change highest level, coupled rankings', async () => {
        // Arrange
        const points = [
          // Games that count for downgrade
          ...generatePoints(GameType.S, -1, 0, 205, 330, 0, 330, 330),
          ...generatePoints(GameType.D, -1, 0, 0, 130, 0, 130, 205, 130),
          ...generatePoints(GameType.MX, -1, 0, 10, 0),
          // Games that doesn't count for downgrade
          ...generatePoints(GameType.D, 3, 0, 0, 0, 0)
        ];
        const lastRanking = {
          mix: 12,
          double: 10,
          single: 10
        } as RankingPlace;
        const inactive = {
          mix: false,
          double: false,
          single: false
        };

        // Act
        const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

        // Assert
        expect(newRanking.single).toBe(8);
        expect(newRanking.double).toBe(10);
        expect(newRanking.mix).toBe(10);
      });
      test('Downgrading, avoid 2 levels at once, avoid downgrading by highest level and letter, coupled rankings', async () => {
        // Arrange
        const points = [
          // Games that count for downgrade
          ...generatePoints(GameType.S, -1, 0, 0, 0, 0),
          ...generatePoints(GameType.MX, -1, 0, 0, 0, 0),
          ...generatePoints(GameType.D, -1, 0, 0),
          // Games that doesn't count for downgrade
          ...generatePoints(GameType.D, 3, 0, 0, 0)
        ];
        const lastRanking = {
          mix: 9,
          double: 10,
          single: 10
        } as RankingPlace;
        const inactive = {
          mix: false,
          double: false,
          single: false
        };

        // Act
        const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

        // Assert
        expect(newRanking.single).toBe(11);
        expect(newRanking.double).toBe(11);
        expect(newRanking.mix).toBe(10);
      });

      test('Real fragment of games', async () => {
        // Arrange
        const points = [
          { points: 0, differenceInLevel: -3, game: { gameType: GameType.D } } as RankingPoint,
          { points: 0, differenceInLevel: -2, game: { gameType: GameType.D } } as RankingPoint,
          { points: 0, differenceInLevel: -2, game: { gameType: GameType.D } } as RankingPoint,
          { points: 680, differenceInLevel: 0, game: { gameType: GameType.D } } as RankingPoint,
          { points: 0, differenceInLevel: -3, game: { gameType: GameType.D } } as RankingPoint,
          { points: 520, differenceInLevel: 0, game: { gameType: GameType.D } } as RankingPoint,
          { points: 0, differenceInLevel: -1, game: { gameType: GameType.D } } as RankingPoint,
          { points: 0, differenceInLevel: -2, game: { gameType: GameType.D } } as RankingPoint,
          { points: 0, differenceInLevel: 3, game: { gameType: GameType.D } } as RankingPoint,
          { points: 80, differenceInLevel: 0, game: { gameType: GameType.D } } as RankingPoint,
          { points: 0, differenceInLevel: 0, game: { gameType: GameType.D } } as RankingPoint
        ];
        const lastRanking = {
          mix: 9,
          double: 8,
          single: 9
        } as RankingPlace;
        const inactive = {
          mix: false,
          double: false,
          single: false
        };

        // Act
        const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

        // Assert
        expect(newRanking.doublePointsDowngrade).toBe(300);
        expect(newRanking.doublePoints).toBe(183);
      });
    });
  });

  describe('BV 70 30 15', () => {
    let service: BvlRankingCalc;

    beforeAll(() => {
      service = new BvlRankingCalc(
        {
          name: '',
          amountOfLevels: 12,
          id: 2,
          caluclationIntervalAmount: 2,
          calculationIntervalUnit: 'months',
          updateIntervalAmount: 52,
          updateIntervalUnit: 'weeks',
          procentWinning: 75,
          procentWinningPlus1: 50,
          procentLosing: 30,
          minNumberOfGamesUsedForUpgrade: 7,
          maxDiffLevels: 2,
          differenceForUpgrade: 1,
          differenceForDowngrade: 0,
          maxLevelDownPerChange: 1,
          gamesForInactivty: 3,
          rankingSystem: RankingSystems.BVL
        } as RankingSystem,
        mockDatabaseService as DataBaseHandler
      );
    });

    test('Real fragment of points', async () => {
      // Arrange
      const points = [
        { points: 1281, game: { gameType: GameType.S }, differenceInLevel: 0 } as RankingPoint,
        { points: 1922, game: { gameType: GameType.S }, differenceInLevel: 0 } as RankingPoint,
        { points: 2883, game: { gameType: GameType.S }, differenceInLevel: 0 } as RankingPoint,
        { points: 2883, game: { gameType: GameType.S }, differenceInLevel: 0 } as RankingPoint,
        { points: 0, game: { gameType: GameType.D }, differenceInLevel: 1 } as RankingPoint,
        { points: 986, game: { gameType: GameType.D }, differenceInLevel: 0 } as RankingPoint,
        { points: 50, game: { gameType: GameType.D }, differenceInLevel: 0 } as RankingPoint,
        { points: 152, game: { gameType: GameType.D }, differenceInLevel: 0 } as RankingPoint,
        { points: 2883, game: { gameType: GameType.MX }, differenceInLevel: 0 } as RankingPoint,
        { points: 50, game: { gameType: GameType.MX }, differenceInLevel: 0 } as RankingPoint,
        { points: 1281, game: { gameType: GameType.MX }, differenceInLevel: 0 } as RankingPoint
      ];
      const lastRanking = {
        mix: 12,
        double: 12,
        single: 12
      } as RankingPlace;
      const inactive = {
        mix: false,
        double: false,
        single: false
      };

      // Act
      const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

      // Assert
      expect(newRanking.singlePointsDowngrade).toBe(2883);
      expect(newRanking.singlePoints).toBe(1281);
      expect(newRanking.doublePointsDowngrade).toBe(493);
      expect(newRanking.doublePoints).toBe(170);
      expect(newRanking.mixPointsDowngrade).toBe(2883);
      expect(newRanking.mixPoints).toBe(602);

      expect(newRanking.single).toBe(3);
      expect(newRanking.double).toBe(5);
      expect(newRanking.mix).toBe(5);
    });

    test.only('Real fragment of games', async () => {
      // Arrange
      const games = [
        {
          id: 1,
          playedAt: new Date('2020-03-01 14:05:00+00'),
          gameType: GameType.S,
          set1Team1: 21,
          set1Team2: 11,
          set2Team1: 21,
          set2Team2: 6,
          winner: 1,
          players: [
            {
              id: 1488344,
              getDataValue: (key: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1394855,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any
          ]
        } as Game,
        {
          id: 2,
          playedAt: new Date('2020-03-01 13:10:00+00'),
          gameType: GameType.MX,
          set1Team1: 21,
          set1Team2: 16,
          set2Team1: 21,
          set2Team2: 12,
          winner: 1,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1384758,
              getDataValue: (test: string) => {
                return { team: 1, player: 2 };
              }
            } as any,
            {
              id: 1385228,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any,
            {
              id: 1394839,
              getDataValue: (test: string) => {
                return { team: 2, player: 2 };
              }
            } as any
          ]
        } as Game,
        {
          id: 3,
          playedAt: new Date('2020-03-01 12:55:00+00'),
          gameType: GameType.S,
          set1Team1: 21,
          set1Team2: 14,
          set2Team1: 21,
          set2Team2: 14,
          winner: 1,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1460180,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any
          ]
        } as Game,
        {
          id: 4,
          playedAt: new Date('2020-03-01 11:10:00+00'),
          gameType: GameType.MX,
          set1Team1: 16,
          set1Team2: 21,
          set2Team1: 21,
          set2Team2: 18,
          set3Team1: 21,
          set3Team2: 19,
          winner: 1,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1384758,
              getDataValue: (test: string) => {
                return { team: 1, player: 2 };
              }
            } as any,
            {
              id: 1385103,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any,
            {
              id: 1491694,
              getDataValue: (test: string) => {
                return { team: 2, player: 2 };
              }
            } as any
          ]
        } as Game,
        {
          id: 5,
          playedAt: new Date('2020-03-01 10:00:00+00'),
          gameType: GameType.MX,
          set1Team1: 21,
          set1Team2: 9,
          set2Team1: 21,
          set2Team2: 14,
          winner: 1,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1384758,
              getDataValue: (test: string) => {
                return { team: 1, player: 2 };
              }
            } as any,
            {
              id: 1548227,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any,
            {
              id: 1548333,
              getDataValue: (test: string) => {
                return { team: 2, player: 2 };
              }
            } as any
          ]
        } as Game,
        {
          id: 6,
          playedAt: new Date('2020-02-29 19:00:00+00'),
          gameType: GameType.D,
          set1Team1: 13,
          set1Team2: 21,
          set2Team1: 21,
          set2Team2: 18,
          set3Team1: 14,
          set3Team2: 21,
          winner: 2,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1460255,
              getDataValue: (test: string) => {
                return { team: 2, player: 2 };
              }
            } as any,
            {
              id: 1385229,
              getDataValue: (test: string) => {
                return { team: 1, player: 2 };
              }
            } as any,
            {
              id: 1460312,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any
          ]
        } as Game,
        {
          id: 7,
          playedAt: new Date('2020-02-29 17:35:00+00'),
          gameType: GameType.D,
          set1Team1: 9,
          set1Team2: 21,
          set2Team1: 14,
          set2Team2: 21,
          winner: 2,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any,
            {
              id: 1548226,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1548227,
              getDataValue: (test: string) => {
                return { team: 1, player: 2 };
              }
            } as any,
            {
              id: 1385229,
              getDataValue: (test: string) => {
                return { team: 2, player: 2 };
              }
            } as any
          ]
        } as Game,
        {
          id: 8,
          playedAt: new Date('2020-02-29 16:15:00+00'),
          gameType: GameType.D,
          set1Team1: 19,
          set1Team2: 21,
          set2Team1: 12,
          set2Team2: 21,
          winner: 2,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any,
            {
              id: 1456075,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1549087,
              getDataValue: (test: string) => {
                return { team: 1, player: 2 };
              }
            } as any,
            {
              id: 1385229,
              getDataValue: (test: string) => {
                return { team: 2, player: 2 };
              }
            } as any
          ]
        } as Game,
        {
          id: 9,
          playedAt: new Date('2020-02-29 14:40:00+00'),
          gameType: GameType.D,
          set1Team1: 21,
          set1Team2: 19,
          set2Team1: 12,
          set2Team2: 21,
          set3Team1: 12,
          set3Team2: 21,
          winner: 2,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any,
            {
              id: 1548371,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1460229,
              getDataValue: (test: string) => {
                return { team: 1, player: 2 };
              }
            } as any,
            {
              id: 1385229,
              getDataValue: (test: string) => {
                return { team: 2, player: 2 };
              }
            } as any
          ]
        } as Game,
        {
          id: 10,
          playedAt: new Date('2020-02-29 12:45:00+00'),
          gameType: GameType.S,
          set1Team1: 14,
          set1Team2: 21,
          set2Team1: 5,
          set2Team2: 21,
          winner: 2,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any,
            {
              id: 1385103,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any
          ]
        } as Game,
        {
          id: 11,
          playedAt: new Date('2020-02-29 10:50:00+00'),
          gameType: GameType.S,
          set1Team1: 21,
          set1Team2: 12,
          set2Team1: 21,
          set2Team2: 8,
          winner: 1,
          players: [
            {
              id: 1488344,
              getDataValue: (test: string) => {
                return { team: 1, player: 1 };
              }
            } as any,
            {
              id: 1462321,
              getDataValue: (test: string) => {
                return { team: 2, player: 1 };
              }
            } as any
          ]
        } as Game
      ];
      const points = [];
      const players = new Map();
      players.set(1488344, {
        id: 1488344,
        getLastRanking: (system: number, max: number) => {
          return {
            single: 12,
            double: 12,
            mix: 12
          };
        }
      } as Player);

      players.set(1385229, {
        id: 1385229,
        firstName: 'Stijn',
        lastName: 'Lenaerts',
        memberId: '50069310',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 1,
            double: 1,
            mix: 1
          };
        }
      } as Player);
      players.set(1394855, {
        id: 1394855,
        firstName: 'Sander',
        lastName: 'Prenen',
        memberId: '50082004',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 3,
            double: 3,
            mix: 3
          };
        }
      } as Player);
      players.set(1460180, {
        id: 1460180,
        firstName: 'Dion',
        lastName: 'Rovers',
        memberId: '840485',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 2,
            double: 2,
            mix: 2
          };
        }
      } as Player);
      players.set(1385103, {
        id: 1385103,
        firstName: 'Tijl',
        lastName: 'Dewit',
        memberId: '50093807',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 2,
            double: 2,
            mix: 2
          };
        }
      } as Player);
      players.set(1462321, {
        id: 1462321,
        firstName: 'Tim',
        lastName: 'Hectors',
        memberId: '763803',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 4,
            double: 4,
            mix: 4
          };
        }
      } as Player);
      players.set(1456075, {
        id: 1456075,
        firstName: 'Jan',
        lastName: 'Hansen',
        memberId: '982018',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 3,
            double: 3,
            mix: 3
          };
        }
      } as Player);
      players.set(1549087, {
        id: 1549087,
        firstName: 'Thijs',
        lastName: 'Van Den Berg',
        memberId: '50095823',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 12,
            double: 12,
            mix: 12
          };
        }
      } as Player);
      players.set(1385229, {
        id: 1385229,
        firstName: 'Stijn',
        lastName: 'Lenaerts',
        memberId: '50069310',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 1,
            double: 1,
            mix: 1
          };
        }
      } as Player);
      players.set(1548226, {
        id: 1548226,
        firstName: 'Matthijs',
        lastName: 'Janz',
        memberId: '875990',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 12,
            double: 12,
            mix: 12
          };
        }
      } as Player);
      players.set(1548227, {
        id: 1548227,
        firstName: 'Marco',
        lastName: 'Oosterhaven',
        memberId: '800170',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 12,
            double: 12,
            mix: 12
          };
        }
      } as Player);

      players.set(1548371, {
        id: 1548371,
        firstName: 'Rik',
        lastName: 'Hermans',
        memberId: '708170',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 12,
            double: 12,
            mix: 12
          };
        }
      } as Player);
      players.set(1460229, {
        id: 1460229,
        firstName: 'Frank',
        lastName: 'Vermeesch',
        memberId: '816689',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 8,
            double: 8,
            mix: 8
          };
        }
      } as Player);

      players.set(1384758, {
        id: 1384758,
        firstName: 'Ann',
        lastName: 'Knaepen',
        memberId: '50081509',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 1,
            double: 1,
            mix: 1
          };
        }
      } as Player);
      players.set(1385228, {
        id: 1385228,
        firstName: 'Maarten',
        lastName: 'Lenaerts',
        memberId: '50078931',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 2,
            double: 2,
            mix: 2
          };
        }
      } as Player);
      players.set(1394839, {
        id: 1394839,
        firstName: 'Birthe',
        lastName: 'Van Den Berg',
        memberId: '50078116',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 2,
            double: 2,
            mix: 2
          };
        }
      } as Player);

      players.set(1491694, {
        id: 1491694,
        firstName: 'Leonie',
        lastName: 'Rovers',
        memberId: '874069',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 7,
            double: 7,
            mix: 7
          };
        }
      } as Player);

      players.set(1548333, {
        id: 1548333,
        firstName: 'Bianca',
        lastName: 'Oosterhaven',
        memberId: '741538',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 12,
            double: 12,
            mix: 12
          };
        }
      } as Player);
      players.set(1460312, {
        id: 1460312,
        firstName: 'Noah',
        lastName: 'Jongen',
        memberId: '888052',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 12,
            double: 12,
            mix: 12
          };
        }
      } as Player);
      players.set(1460255, {
        id: 1460255,
        firstName: 'Rick',
        lastName: 'Steuten',
        memberId: '711988',
        getLastRanking: (system: number, max: number) => {
          return {
            single: 2,
            double: 2,
            mix: 2
          };
        }
      } as Player);

      // Act
      games.forEach(game => {
        const newPoints = service.processGame(
          game,
          players,
          moment('2019-03-02T23:00:00.000Z').toDate()
        );
        newPoints.forEach(element => {
          points.push({
            ...element,
            game
          });
        });
      });
      const adePoints = points.filter(x => x.PlayerId === 1488344);

      const lastRanking = {
        mix: 12,
        double: 12,
        single: 12
      } as RankingPlace;
      const inactive = {
        mix: false,
        double: false,
        single: false
      };

      // Act
      const newRanking = await service.findNewPlacePlayer(adePoints, lastRanking, inactive);

      // Assert
      expect(adePoints.length).toBe(11);

      expect(newRanking.single).toBe(3);
      expect(newRanking.double).toBe(5);
      expect(newRanking.mix).toBe(4);

      expect(newRanking.singlePoints).toBeGreaterThan(0);
      expect(newRanking.doublePoints).toBeGreaterThan(0);
      expect(newRanking.mixPoints).toBeGreaterThan(0);
      expect(newRanking.singlePointsDowngrade).toBeGreaterThan(0);
      expect(newRanking.doublePointsDowngrade).toBeGreaterThan(0);
      expect(newRanking.mixPointsDowngrade).toBeGreaterThan(0);
    });
  });
});

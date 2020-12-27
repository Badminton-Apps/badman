import { DataBaseHandler } from '@badvlasim/shared/database/databse.service';
import { GameType, RankingPlace, RankingSystem, RankingSystems } from '@badvlasim/shared/models';
import { MockObj } from '@badvlasim/shared/testing/mock-obj';
import { generatePoints } from '@badvlasim/shared/testing/utils';
import { LfbbRankingCalc } from '../models';

jest.mock('@badvlasim/shared/models/sequelize/ranking-system.model');

describe('lfbb', () => {
  let service: LfbbRankingCalc;
  let mockDatabaseService: MockObj<DataBaseHandler>;

  beforeAll(() => {
    service = new LfbbRankingCalc(
      {
        id: 1,
        name: '',
        amountOfLevels: 17,
        maxDiffLevels: 3,
        minNumberOfGamesUsedForUpgrade: 7,
        caluclationIntervalAmount: 3,
        calculationIntervalUnit: 'months',
        updateIntervalAmount: 52,
        updateIntervalUnit: 'weeks',
        rankingSystem: RankingSystems.LFBB,
        differenceForDowngrade: 0,
        differenceForUpgrade: 1,
        maxLevelDownPerChange: 1,
        maxLevelUpPerChange: 1
      } as RankingSystem,
      mockDatabaseService as DataBaseHandler
    );
  });

  test('Test point caps', () => {
    expect(service.pointsToGoUp).toStrictEqual([
      5, // to 16
      20, // to 15
      31, // to 14
      38, // to 13
      61, // to 12
      83, // to 11
      106, // to 10
      128, // to 9
      196, // to 8
      263, // to 7
      331, // to 6
      398, // to 5
      601, // to 4
      803, // to 3
      1006, // to 2
      1208 // to 1
    ]);
    expect(service.pointsToGoDown).toStrictEqual([
      5, // to 17
      20, // to 16
      31, // to 15
      38, // to 14
      61, // to 13
      83, // to 12
      106, // to 11
      128, // to 10
      196, // to 9
      263, // to 8
      331, // to 7
      398, // to 6
      601, // to 5
      803, // to 4
      1006, // to 3
      1208 // to 2
    ]);
    expect(service.pointsWhenWinningAgainst).toStrictEqual([
      10,
      30,
      45,
      60,
      75,
      120,
      165,
      210,
      255,
      390,
      525,
      660,
      795,
      1200,
      1605,
      2010,
      2415
    ]);
  });
  describe('find new ranking level', () => {
    test('Points for upgrading 2 levels, limited by rules to 1, low level', () => {
      // Arrange
      const currentLevel = 17;
      const findPointsDowngrade = 25;
      const findPointsUpgrade = 22;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(16);
    });
    test('Points for upgrading 2 levels, limited by rules to 1, high level', () => {
      // Arrange
      const currentLevel = 3;
      const findPointsDowngrade = 1300;
      const findPointsUpgrade = 1250;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(2);
    });
    test('Points for upgrading 1 level, low level', () => {
      // Arrange
      const currentLevel = 17;
      const findPointsDowngrade = 17;
      const findPointsUpgrade = 15;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(16);
    });
    test('Points for upgrading 1 level, high level', () => {
      // Arrange
      const currentLevel = 3;
      const findPointsDowngrade = 1150;
      const findPointsUpgrade = 1100;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(2);
    });
    test('Points for staying same level, low level', () => {
      // Arrange
      const currentLevel = 15;
      const findPointsDowngrade = 32;
      const findPointsUpgrade = 25;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(15);
    });
    test('Points for staying same level, high level', () => {
      // Arrange
      const currentLevel = 3;
      const findPointsDowngrade = 1006;
      const findPointsUpgrade = 780;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(3);
    });
    test('Points for downgrading, low level', () => {
      // Arrange
      const currentLevel = 15;
      const findPointsDowngrade = 15;
      const findPointsUpgrade = 0;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(16);
    });
    test('Points for downgrading, high level', () => {
      // Arrange
      const currentLevel = 3;
      const findPointsDowngrade = 802;
      const findPointsUpgrade = 400;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(4);
    });
    test('Points for downgrading 2 levels, limited by rules to 1, low level', () => {
      // Arrange
      const currentLevel = 14;
      const findPointsDowngrade = 15;
      const findPointsUpgrade = 10;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(15);
    });
    test('Points for downgrading 2 levels, limited by rules to 1, high level', () => {
      // Arrange
      const currentLevel = 3;
      const findPointsDowngrade = 400;
      const findPointsUpgrade = 350;

      // Act
      const newRanking = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newRanking).toBe(4);
    });
  });
  describe('Get points for upgrading', () => {
    test('More than 7 matches', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 45, 45, 0, 45, 60, 45, 45, 60)];
      // Act
      const findPointsUpgrade = service.findPointsBetterAverage(points);

      // Assert
      expect(findPointsUpgrade).toBe(38);
    });
    test('Less than 7 and more than 1 match', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 45, 0, 45, 60, 45)];

      // Act
      const findPointsUpgrade = service.findPointsBetterAverage(points);

      // Assert
      expect(findPointsUpgrade).toBe(28);
    });
    test('Less than 2 matches', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 45)];

      // Act
      const findPointsUpgrade = service.findPointsBetterAverage(points);

      // Assert
      expect(findPointsUpgrade).toBe(6);
    });
  });
  describe('Get points for dowgrading', () => {
    test('More than 7 matches', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 45, 45, 0, 45, 60, 45, 45, 60)];
      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);

      // Assert
      expect(findPointsDowngrade).toBe(38);
    });
    test('Less than 7 and more than 1 match', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 45, 0, 45, 60, 45)];

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);

      // Assert
      expect(findPointsDowngrade).toBe(28);
    });
  });
  describe('Combined upgrading/downgrading/find new ranking', () => {
    test('Test case 1', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 60, 0, 60, 75, 60, 75, 60)];
      const currentLevel = 14;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(13);
    });
    test('Test case 2', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 60, 0, 60, 75, 60, 75, 60)];
      const currentLevel = 15;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(14);
    });
    test('Test case 3', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 60, 0, 60, 75, 60, 75, 60)];
      const currentLevel = 13;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(13);
    });
    test('Test case 4', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 60, 0, 60, 75, 60, 75, 60)];
      const currentLevel = 12;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(13);
    });
    test('Test case 5', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 60, 0, 60, 75, 60, 75, 60)];
      const currentLevel = 11;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(12);
    });
    test('Test case 6', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 0, 60, 75, 75)];

      const currentLevel = 13;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(13);
    });
    test('Test case 7', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 0, 60, 75, 60)];
      const currentLevel = 14;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(14);
    });
    test('Test case 8', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 0, 60, 75, 60)];
      const currentLevel = 15;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(14);
    });
    test('Test case 9', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 0, 60, 75, 60)];
      const currentLevel = 13;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(14);
    });
    test('Test case 10', () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 0, 60, 75, 75)];
      const currentLevel = 12;

      // Act
      const findPointsDowngrade = service.findPointsBetterAverage(points);
      const findPointsUpgrade = service.findPointsBetterAverage(points);
      const newLevel = service.findRanking(findPointsUpgrade, findPointsDowngrade, currentLevel);

      // Assert
      expect(newLevel).toBe(13);
    });
  });
  describe('combined with protections', () => {
    test('Test case with 3 periods ', async () => {
      // Arrange
      const points = [
        ...generatePoints(GameType.S, 0, 0),
        ...generatePoints(GameType.MX, 0, 1200, 0, 1200, 795, 1200, 1200)
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
      expect(newRanking3.single).toBe(6);
      expect(newRanking3.double).toBe(7);
      expect(newRanking3.mix).toBe(4);
    });
    test('Normal upgrading', async () => {
      // Arrange
      const points = [...generatePoints(GameType.S, 0, 0, 60, 60, 0, 60, 75, 60, 75, 60)];
      const lastRanking = {
        mix: 14,
        double: 14,
        single: 14
      } as RankingPlace;
      const inactive = {
        mix: false,
        double: false,
        single: false
      };

      // Act
      const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

      // Assert
      expect(newRanking.single).toBe(13);
      expect(newRanking.double).toBe(15);
      expect(newRanking.mix).toBe(15);
    });
    test('Normal upgrading, avoid downgrading, change highest level', async () => {
      // Arrange
      const points = [
        // Games that count for downgrade
        ...generatePoints(GameType.S, 0, 0, 60, 75, 0, 75, 75),
        ...generatePoints(GameType.D, 0, 0, 60, 60, 0, 60, 75, 60),
        ...generatePoints(GameType.MX, 0, 0, 60, 60, 0, 60, 75, 60, 75, 60),
        // Games that doesn't count for downgrade
        ...generatePoints(GameType.D, 3, 0, 0, 0, 0)
      ];
      const lastRanking = {
        mix: 14,
        double: 13,
        single: 14
      } as RankingPlace;
      const inactive = {
        mix: false,
        double: false,
        single: false
      };

      // Act
      const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

      // Assert
      expect(newRanking.single).toBe(13);
      expect(newRanking.double).toBe(14);
      expect(newRanking.mix).toBe(13);
    });
    test('Upgrading, avoid 2 levels at once, avoid downgrading, change highest level, coupled rankings', async () => {
      // Arrange
      const points = [
        // Games that count for downgrade
        ...generatePoints(GameType.S, 0, 0, 120, 75, 0, 120, 75),
        ...generatePoints(GameType.MX, 0, 0, 10),
        ...generatePoints(GameType.D, 0, 0, 30, 45, 0, 30, 45, 30, 30, 30),
        // Games that doesn't count for downgrade
        ...generatePoints(GameType.D, 3, 0, 0, 0, 0)
      ];
      const lastRanking = {
        mix: 17,
        double: 15,
        single: 14
      } as RankingPlace;
      const inactive = {
        mix: false,
        double: false,
        single: false
      };

      // Act
      const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

      // Assert
      expect(newRanking.single).toBe(13);
      expect(newRanking.double).toBe(16);
      expect(newRanking.mix).toBe(16);
    });
    test('Downgrading, avoid 2 levels at once, avoid downgrading by highest level and letter, coupled rankings', async () => {
      // Arrange
      const points = [
        // Games that count for downgrade
        ...generatePoints(GameType.S, 0, 0),
        ...generatePoints(GameType.MX, 0, 0),
        ...generatePoints(GameType.D, 0, 0),
        // Games that doesn't count for downgrade
        ...generatePoints(GameType.D, 3, 0)
      ];
      const lastRanking = {
        mix: 15,
        double: 12,
        single: 14
      } as RankingPlace;
      const inactive = {
        mix: false,
        double: false,
        single: false
      };

      // Act
      const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

      // Assert
      expect(newRanking.single).toBe(15);
      expect(newRanking.double).toBe(13);
      expect(newRanking.mix).toBe(16);
    });
    test('Yuhan Tan results', async () => {
      // Arrange
      const points = [
        // Games that count for downgrade
        ...generatePoints(GameType.S, 0, 1200, 2010, 2010, 1200, 1200, 1605, 1605, 1605, 2010, 1605)
      ];
      const lastRanking = {
        mix: 4,
        double: 4,
        single: 1
      } as RankingPlace;
      const inactive = {
        mix: false,
        double: false,
        single: false
      };

      // Act
      const newRanking = await service.findNewPlacePlayer(points, lastRanking, inactive);

      // Assert
      expect(newRanking.single).toBe(1);
      expect(newRanking.double).toBe(4);
      expect(newRanking.mix).toBe(4);
    });
  });
});

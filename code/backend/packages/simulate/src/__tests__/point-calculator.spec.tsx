import { GameType, RankingSystem } from '@badvlasim/shared/models';
import { PointCalculator } from '../models';

const lfbbPointswin = [
  10,
  30,
  45,
  60,
  75,
  90,
  135,
  180,
  225,
  270,
  405,
  540,
  675,
  810,
  1215,
  1630,
  2045
];

const rankingTypeMock = {
  id: 1,
  amountOfLevels: lfbbPointswin.length
} as RankingSystem;

const getPlayers = (
  levelp1Team1: number,
  levelp1Team2: number,
  levelp2Team1?: number,
  levelp2Team2?: number
) => {
  let player1Team1 = null;
  let player2Team1 = null;
  let player1Team2 = null;
  let player2Team2 = null;

  if (levelp1Team1) {
    player1Team1 = {
      id: 1,
      getLastRanking: id => {
        return {
          SystemId: id,
          single: levelp1Team1,
          double: levelp1Team1,
          mix: levelp1Team1
        };
      }
    };
  }
  if (levelp1Team2) {
    player1Team2 = {
      id: 2,
      getLastRanking: id => {
        return {
          SystemId: id,
          single: levelp1Team2,
          double: levelp1Team2,
          mix: levelp1Team2
        };
      }
    };
  }
  if (levelp2Team1) {
    player2Team1 = {
      id: 3,
      getLastRanking: id => {
        return {
          SystemId: id,
          single: levelp2Team1,
          double: levelp2Team1,
          mix: levelp2Team1
        };
      }
    };
  }
  if (levelp2Team2) {
    player2Team2 = {
      id: 4,
      getLastRanking: id => {
        return {
          SystemId: id,
          single: levelp2Team2,
          double: levelp2Team2,
          mix: levelp2Team2
        };
      }
    };
  }

  return {
    player1Team1,
    player1Team2,
    player2Team1,
    player2Team2
  };
};

class TestCase {
  levelp1Team1: number;
  levelp2Team1: number;
  levelp1Team2: number;
  levelp2Team2: number;
  winner: 1 | 2;
  gameType: GameType;
  player1Team1: number;
  player2Team1: number;
  player1Team2: number;
  player2Team2: number;
  sysem?: RankingSystem;
}

const single = [
  {
    levelp1Team1: 10,
    levelp1Team2: 9,
    gameType: GameType.S,
    winner: 1,
    player1Team1: 225,
    player1Team2: 0
  } as TestCase,
  {
    gameType: GameType.S,
    winner: 1,
    player1Team1: 10,
    player1Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp1Team2: 9,
    gameType: GameType.S,
    winner: 1,
    player1Team1: 225,
    player1Team2: 0
  } as TestCase,
  {
    levelp1Team1: 8,
    levelp1Team2: 9,
    gameType: GameType.S,
    winner: 1,
    player1Team1: 225,
    player1Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp1Team2: 10,
    gameType: GameType.S,
    winner: 1,
    player1Team1: 180,
    player1Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp1Team2: 11,
    gameType: GameType.S,
    winner: 1,
    player1Team1: 135,
    player1Team2: 0
  } as TestCase,
  {
    levelp1Team2: 9,
    gameType: GameType.S,
    winner: 2,
    player1Team1: 0,
    player1Team2: 10
  } as TestCase,
  {
    levelp1Team1: 7,
    levelp1Team2: 6,
    gameType: GameType.S,
    winner: 2,
    player1Team1: 0,
    player1Team2: 405
  } as TestCase,
  {
    levelp1Team1: 1,
    levelp1Team2: 1,
    gameType: GameType.S,
    winner: 2,
    player1Team1: 0,
    player1Team2: 2045
  } as TestCase
];

const double = [
  {
    levelp1Team1: 10,
    levelp2Team1: 10,
    levelp1Team2: 9,
    levelp2Team2: 9,
    gameType: GameType.D,
    winner: 1,
    player1Team1: 225,
    player2Team1: 225,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp2Team1: 9,
    levelp1Team2: 9,
    levelp2Team2: 9,
    gameType: GameType.D,
    winner: 1,
    player1Team1: 225,
    player2Team1: 225,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 8,
    levelp2Team1: 8,
    levelp1Team2: 9,
    levelp2Team2: 9,
    gameType: GameType.D,
    winner: 1,
    player1Team1: 225,
    player2Team1: 225,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp2Team1: 9,
    levelp1Team2: 10,
    levelp2Team2: 10,
    gameType: GameType.D,
    winner: 1,
    player1Team1: 180,
    player2Team1: 180,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp2Team1: 9,
    levelp1Team2: 11,
    levelp2Team2: 11,
    gameType: GameType.D,
    winner: 1,
    player1Team1: 135,
    player2Team1: 135,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 1,
    levelp2Team1: 1,
    levelp1Team2: 2,
    levelp2Team2: 2,
    gameType: GameType.D,
    winner: 2,
    player1Team1: 0,
    player2Team1: 0,
    player1Team2: 2045,
    player2Team2: 2045
  } as TestCase,
  {
    levelp1Team1: 12,
    levelp2Team1: 10,
    levelp1Team2: 6,
    levelp2Team2: 7,
    gameType: GameType.D,
    winner: 2,
    player1Team1: 0,
    player2Team1: 0,
    player1Team2: 135,
    player2Team2: 135
  } as TestCase,
  {
    levelp1Team1: 5,
    levelp2Team1: 6,
    levelp1Team2: 6,
    levelp2Team2: 7,
    gameType: GameType.D,
    winner: 2,
    player1Team1: 0,
    player2Team1: 0,
    player1Team2: 607.5,
    player2Team2: 607.5
  } as TestCase
];

const mix = [
  {
    levelp1Team1: 10,
    levelp2Team1: 10,
    levelp1Team2: 9,
    levelp2Team2: 9,
    gameType: GameType.MX,
    winner: 1,
    player1Team1: 225,
    player2Team1: 225,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 15,
    levelp2Team1: 13,
    levelp1Team2: 16,
    levelp2Team2: 15,
    gameType: GameType.MX,
    winner: 1,
    player1Team1: 37.5,
    player2Team1: 37.5,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp2Team1: 9,
    levelp1Team2: 9,
    levelp2Team2: 9,
    gameType: GameType.MX,
    winner: 1,
    player1Team1: 225,
    player2Team1: 225,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 8,
    levelp2Team1: 8,
    levelp1Team2: 9,
    levelp2Team2: 9,
    gameType: GameType.MX,
    winner: 1,
    player1Team1: 225,
    player2Team1: 225,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp2Team1: 9,
    levelp1Team2: 10,
    levelp2Team2: 10,
    gameType: GameType.MX,
    winner: 1,
    player1Team1: 180,
    player2Team1: 180,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 9,
    levelp2Team1: 9,
    levelp1Team2: 11,
    levelp2Team2: 11,
    gameType: GameType.MX,
    winner: 1,
    player1Team1: 135,
    player2Team1: 135,
    player1Team2: 0,
    player2Team2: 0
  } as TestCase,
  {
    levelp1Team1: 2,
    levelp2Team1: 3,
    levelp1Team2: 3,
    levelp2Team2: 4,
    gameType: GameType.MX,
    winner: 2,
    player1Team1: 0,
    player2Team1: 0,
    player1Team2: 1422.5,
    player2Team2: 1422.5
  } as TestCase
];

describe('Point calcaulator', () => {
  describe.each([...mix, ...single, ...double])('', testCase => runTest(testCase));

  const runTest = ({
    levelp1Team1,
    levelp1Team2,
    levelp2Team1,
    levelp2Team2,
    gameType,
    winner,
    player1Team1,
    player1Team2,
    player2Team1,
    player2Team2
  }: TestCase) => {
    let description = '';

    if (gameType === GameType.S) {
      description = `S ${levelp1Team1} vs ${levelp1Team2} won by ${
        winner === 1 ? 'Team 1' : 'Team 2'
      }`;
    } else {
      description = `${gameType} ${levelp1Team1} + ${levelp2Team1} vs ${levelp1Team2} + ${levelp2Team2} won by ${
        winner === 1 ? 'Team 1' : 'Team 2'
      }`;
    }

    test(`[Normal] ${description}`, () => {
      const players = getPlayers(levelp1Team1, levelp1Team2, levelp2Team1, levelp2Team2);
      const gameMock = {
        type: rankingTypeMock,
        gameType,
        winner
      };

      const calcaulator = new PointCalculator(rankingTypeMock);

      // Act
      const points = calcaulator.getPointsForGame(
        gameMock as any,
        players.player1Team1,
        players.player1Team2,
        players.player2Team1,
        players.player2Team2
      );

      // Asert
      expect(points.player1Team1Points).toEqual(player1Team1);
      expect(points.player1Team2Points).toEqual(player1Team2);
      if (gameType !== GameType.S) {
        expect(points.player2Team1Points).toEqual(player2Team1);
        expect(points.player2Team2Points).toEqual(player2Team2);
      } else {
        expect(points.player2Team1Points).toBeNull();
        expect(points.player2Team2Points).toBeNull();
      }
    });
    test(`[Reversed] ${description}`, () => {
      const players = getPlayers(levelp1Team1, levelp1Team2, levelp2Team1, levelp2Team2);

      const gameMock = {
        type: rankingTypeMock,
        gameType,
        winner,
        ...players
      };

      const calcaulator = new PointCalculator(rankingTypeMock);

      // Act
      const points = calcaulator.getPointsForGame(
        gameMock as any,
        players.player1Team1,
        players.player1Team2,
        players.player2Team1,
        players.player2Team2
      );

      // Asert
      expect(points.player1Team1Points).toEqual(player1Team1);
      expect(points.player1Team2Points).toEqual(player1Team2);
      if (gameType !== GameType.S) {
        expect(points.player2Team1Points).toEqual(player2Team1);
        expect(points.player2Team2Points).toEqual(player2Team2);
      } else {
        expect(points.player2Team1Points).toBeNull();
        expect(points.player2Team2Points).toBeNull();
      }
    });
  };
});

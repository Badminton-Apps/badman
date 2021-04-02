import { GameType, RankingPoint } from '../models';

export const generatePoints = (
  gameType: GameType,
  differenceInLevel: number = 0,
  ...points: number[]
): RankingPoint[] => {
  return points.map(point => {
    return {
      points: point,
      differenceInLevel,
      game: {
        gameType
      }
    } as RankingPoint;
  });
};

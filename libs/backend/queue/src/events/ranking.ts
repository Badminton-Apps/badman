export enum Ranking {
  UpdateRanking = 'UpdateRanking',
}


export interface UpdateRankingJob {
  systemId: string;
  recalculatePoints: boolean;
  calculatePoints: boolean;
  calculatePlaces: boolean;
  calculateRanking: boolean;
  fromDate: string;
  toDate: string;
}

export enum Ranking {
  UpdateRanking = 'UpdateRanking',
}


export interface UpdateRankingJob {
  systemId: string;
  recalculatePoints: boolean;
}

export enum Simulation {
  Start = 'StartSimulation',
  Calculate = 'CalculateSimulation',
  CalculatePlace = 'CalculatePlace',
  CalculatePoint = 'CalculatePoint',
}

export interface SimulationV2Job {
  systemId: string;
  calcDate?: Date | string;
  periods?: number;
  recalculatePoints?: boolean;
}

export interface SimulationPointsJob {
  gameId: string;
  systemId: string;
}

export interface SimulationPlaceJob {
  playerId: string;
  systemId: string;
  stop: string;
  start: string;
  updateRanking: boolean;
}

export enum Simulation {
  Start = 'StartSimulation',
}

export interface SimulationV2Job {
  systemId: string;
  calcDate?: Date | string;
  periods?: number;
}

export enum Simulation {
  Start = 'StartSimulation',
  StartV2 = 'StartSimulationV2',
}

export interface SimulationV2Job {
  systemId: string;
  calcDate?: Date | string;
  periods?: number;
}
